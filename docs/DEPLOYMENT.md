# Game Server Manager - Production Deployment Guide

## Architecture Diagram

```
                                    Internet
                                        |
                                    [DNS: your-domain.com]
                                        |
                                    [Cloudflare/DDOS Protection]
                                        |
                                   [Nginx :80/:443]
                                    /            \
                                   /              \
                          [Frontend :3000]    [Backend :3001]
                          (Next.js SSR)       (NestJS API)
                               |                    |
                               |              [Socket.IO]
                               |              (WebSocket)
                               |                    |
                               |         +----------+----------+
                               |         |                     |
                               |   [PostgreSQL :5432]    [Redis :6379]
                               |         |                     |
                               |   [Persistent Volumes]   [Persistent Volume]
                               |
                          [Monitoring Stack]
                         /         |         \
                   [Prometheus] [Grafana] [Certbot]
                   (:9090)      (:3002)    (SSL Renewal)

    User → Nginx → Frontend (Next.js SSR)           [HTTP/HTTPS]
    User → Nginx → Backend (NestJS API)             [REST API]
    User → Nginx → Backend (Socket.IO)              [WebSocket]
    Backend → PostgreSQL                             [Database]
    Backend → Redis                                  [Cache/PubSub]
    Backend → Prometheus                             [Metrics]
    Grafana → Prometheus                             [Visualization]
    Certbot → Let's Encrypt → Nginx                  [SSL Certificates]
```

## Prerequisites

### Server Requirements
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM      | 4 GB    | 8 GB        |
| CPU      | 2 cores | 4 cores     |
| Storage  | 20 GB   | 50 GB SSD   |
| OS       | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

### Software Requirements
- Docker Engine 24+ and Docker Compose v2+
- Git
- Domain name with DNS A record pointing to server IP
- Ports 80 and 443 open on firewall

### Domain DNS Configuration
```
Type: A Record
Name: @
Value: <server-ip-address>
TTL: 300 (auto)

Type: A Record
Name: www
Value: <server-ip-address>
TTL: 300 (auto)
```

## Quick Start

### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/server-manager-panel.git
cd server-manager-panel
```

### Step 2: Configure Environment
```bash
cp .env.production .env
# Edit .env with your values:
# - Generate strong random secrets
# - Set your domain name
# - Set database passwords
```

### Step 3: Generate Secrets
```bash
# JWT Secret (64 chars)
openssl rand -base64 48 | head -c 64

# JWT Refresh Secret (64 chars)
openssl rand -base64 48 | head -c 64

# Encryption Key (32 chars for AES-256)
openssl rand -base64 24 | head -c 32

# Database Password (32 chars)
openssl rand -base64 24 | head -c 32
```

### Step 4: Start Services
```bash
docker compose up -d
```

### Step 5: Access Dashboard
- Frontend: http://localhost:3000
- API Health: http://localhost:3001/api/health
- Grafana: http://localhost:3002 (admin/admin)
- Prometheus: http://localhost:9090

### Default Admin Login
- Username: `admin`
- Password: `admin123`

**IMPORTANT:** Change the default admin password immediately after first login.

## Production Deployment Steps

### 1. System Preparation

#### Install Docker
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose v2
sudo apt install -y docker-compose-v2

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

#### Configure Firewall
```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow monitoring (internal only)
sudo ufw allow from 10.0.0.0/8 to any port 9090
sudo ufw allow from 10.0.0.0/8 to any port 3002

# Enable firewall
sudo ufw enable
```

#### Install fail2ban
```bash
sudo apt install -y fail2ban

# Configure SSH protection
sudo tee /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

#### Configure Automatic Updates
```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 2. SSL Certificate Setup

#### Configure Nginx for SSL Validation
Ensure your domain DNS is pointing to the server before proceeding.

#### Obtain Certificate with Certbot
```bash
# The certbot container will handle certificate issuance
# First, start nginx with the HTTP-only config
docker compose up -d nginx

# Run certbot manually to obtain initial certificate
docker compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com \
  -d www.your-domain.com

# Reload nginx to pick up certificates
docker compose exec nginx nginx -s reload
```

#### Auto-Renewal
Certificates are automatically renewed by the certbot service.
Renewal check runs every 12 hours. No additional configuration needed.

### 3. Database Configuration

#### PostgreSQL Tuning
Create `docker/postgres/postgresql.conf` for production tuning:
```ini
# Memory
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 16MB
maintenance_work_mem = 64MB

# Connections
max_connections = 100

# Write Ahead Log
wal_level = replica
max_wal_size = 1GB
min_wal_size = 256MB

# Query Planner
random_page_cost = 1.1
effective_io_concurrency = 200

# Monitoring
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
```

Mount the config in docker-compose.yml:
```yaml
volumes:
  - ./docker/postgres/postgresql.conf:/etc/postgresql/postgresql.conf
```

#### Backup Strategy

##### Automated Database Backups
Create a backup script `scripts/backup-db.sh`:
```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/postgres"

mkdir -p "$BACKUP_DIR"

docker compose exec -T postgres pg_dump \
  -U "$DB_USERNAME" \
  -d "$DB_DATABASE" \
  --format=custom \
  --compress=9 \
  --file="/tmp/backup_$TIMESTAMP.dump"

docker compose cp "postgres:/tmp/backup_$TIMESTAMP.dump" "$BACKUP_DIR/"

# Keep last 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete
```

Add to crontab:
```bash
0 2 * * * /opt/server-manager/scripts/backup-db.sh
```

##### Point-in-Time Recovery
Enable WAL archiving in `docker/postgres/postgresql.conf`:
```ini
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/data/archive/%f'
```

### 4. Performance Optimization

#### Nginx Caching
Enable caching for API responses in `docker/nginx/sites/default`:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m use_temp_path=off;

server {
    location /api {
        proxy_cache api_cache;
        proxy_cache_key "$scheme$request_method$host$request_uri";
        proxy_cache_valid 200 5m;
        proxy_cache_use_stale error timeout updating;
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

#### Database Indexing
Create additional indices based on query patterns:
```sql
CREATE INDEX IF NOT EXISTS idx_servers_user_id ON servers(user_id);
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_servers_game ON servers(game);
CREATE INDEX IF NOT EXISTS idx_players_server_id ON players(server_id);
CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_bans_expires_at ON bans(expires_at);
```

#### Node.js Clustering
The NestJS backend automatically handles clustering in production mode.
For additional horizontal scaling, increase replica count in docker-compose.prod.yml.

#### Load Balancing
With multiple replicas, Docker Compose provides built-in load balancing via DNS round-robin. For production-grade load balancing, consider:

- **Option A:** Increase Nginx upstream servers
- **Option B:** Use Docker Swarm with internal load balancing
- **Option C:** Deploy behind an external load balancer (AWS ALB, HAProxy)

### 5. Monitoring Setup

#### Prometheus Metrics
Prometheus scrapes metrics from the backend at `/api/metrics/server`.
Available metrics include:
- HTTP request duration and count
- Active game server count (by status)
- Player count across all servers
- Resource usage (CPU, memory, disk)
- Socket.IO connection count
- Database query performance

#### Grafana Dashboards
Pre-configured dashboards are provisioned automatically. Access Grafana at:
- URL: http://localhost:3002
- Default credentials: admin / admin (change immediately)

Dashboards are defined in `docker/grafana/dashboards/` and auto-loaded.

#### Alerting Rules
Create alerting rules in `docker/prometheus/alerts/`:
```yaml
groups:
  - name: server-manager-alerts
    rules:
      - alert: BackendDown
        expr: up{job="server-manager-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Backend service is down"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High HTTP error rate detected"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1e9 > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on backend"
```

Configure Alertmanager in `docker/prometheus/alertmanager.yml` for email/slack/pagerduty notifications.

#### Log Aggregation
For production logging, consider:
- **Option A:** ELK Stack (Elasticsearch, Logstash, Kibana)
- **Option B:** Loki + Grafana (lighter alternative)
- **Option C:** Cloud logging (AWS CloudWatch, GCP Cloud Logging)

All container logs are output to Docker's json-file driver with rotation:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### 6. Security Hardening

#### Rate Limiting
Rate limiting is configured at two levels:
1. **Nginx level:** Global rate zones with 30 req/s for API, 10 req/s for auth
2. **Application level:** NestJS @nestjs/throttler with per-endpoint limits

#### DDoS Protection
- **Nginx:** `limit_req` and `limit_conn` modules
- **Cloudflare:** Enable WAF, DDoS protection, and Bot Fight Mode
- **Docker:** Container resource limits prevent resource exhaustion

#### SQL Injection Prevention
- TypeORM parameterized queries (all queries use parameterized statements)
- Input validation with class-validator
- Never use raw SQL concatenation

#### XSS Prevention
- Nginx `X-XSS-Protection` header
- React's built-in XSS protection via JSX auto-escaping
- Content Security Policy headers
- Input sanitization on all user inputs

#### CSRF Protection
- JWT tokens in Authorization header (not cookies)
- Refresh token rotation
- CORS configured at the application level
- SameSite cookie attributes

#### Security Headers
Configured in Nginx:
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

#### Regular Updates
```bash
# Update Docker images
docker compose pull
docker compose up -d

# System updates
sudo apt update && sudo apt upgrade -y
sudo systemctl reboot

# Automate with crontab (weekly)
0 3 * * 1 /opt/server-manager/scripts/update.sh
```

### 7. Backup Strategy

#### Backup Script (`scripts/backup-all.sh`)
```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="/opt/backups"
mkdir -p "$BACKUP_ROOT"/{database,servers,configs}

# Database backup
docker compose exec -T postgres pg_dump \
  -U "$DB_USERNAME" -d "$DB_DATABASE" \
  --format=custom --compress=9 \
  > "$BACKUP_ROOT/database/db_$TIMESTAMP.dump"

# Server build files backup
tar -czf "$BACKUP_ROOT/servers/builds_$TIMESTAMP.tar.gz" \
  -C /var/lib/docker/volumes/server-manager-panel_server_builds/_data .

# Server data backup
tar -czf "$BACKUP_ROOT/servers/data_$TIMESTAMP.tar.gz" \
  -C /var/lib/docker/volumes/server-manager-panel_server_data/_data .

# Configuration backup
tar -czf "$BACKUP_ROOT/configs/config_$TIMESTAMP.tar.gz" \
  -C /opt/server-manager docker/ .env docker-compose.yml

# Retention: keep 30 days
find "$BACKUP_ROOT" -type f -mtime +30 -delete

# Upload to offsite (optional)
# rclone copy "$BACKUP_ROOT" remote:backups/
```

#### Offsite Backup (using rclone)
```bash
# Install rclone
sudo apt install -y rclone

# Configure remote (e.g., Google Drive, S3, Backblaze)
rclone config

# Upload backups
rclone sync /opt/backups remote:server-manager-backups/
```

### 8. Scaling Guide

#### Horizontal Scaling
```yaml
# docker-compose.prod.yml
services:
  backend:
    deploy:
      replicas: 4  # Increase based on load
      resources:
        limits:
          cpus: '2'
          memory: 2G

  frontend:
    deploy:
      replicas: 3
```

#### Database Replication
For read-heavy workloads, set up PostgreSQL read replicas:
1. Configure primary for replication in postgresql.conf
2. Add replica service in docker-compose.yml
3. Configure TypeORM read/write separation

#### Docker Swarm Mode
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml server-manager
```

#### Kubernetes
For large-scale deployments, use the provided K8s manifests:
```bash
# Convert docker-compose to K8s (using kompose)
kompose convert -f docker-compose.yml -f docker-compose.prod.yml

# Or use Helm
helm install server-manager ./helm/
```

### 9. Troubleshooting

#### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Container won't start | Port conflict | Check `netstat -tulpn` for port usage |
| Database connection refused | PostgreSQL not healthy | Wait 30s for first startup |
| SSL certificate error | DNS not propagated | Verify A record with `dig your-domain.com` |
| Socket.IO connection fails | WebSocket not upgraded | Check Nginx WebSocket config |
| 502 Bad Gateway | Backend not responding | Check `docker compose logs backend` |
| 413 Request Entity Too Large | Upload size exceeded | Increase `client_max_body_size` in Nginx |
| Out of memory | Container memory leak | Set memory limits in docker-compose.prod.yml |

#### Log Locations
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Last 100 lines with timestamps
docker compose logs --tail=100 -t backend

# Nginx access logs
docker compose exec nginx tail -f /var/log/nginx/access.log
docker compose exec nginx tail -f /var/log/nginx/error.log
```

#### Debug Mode
```bash
# Enable debug logging on backend
docker compose stop backend
docker compose run -e LOG_LEVEL=debug backend

# Check database queries
docker compose exec postgres psql -U postgres -d server_manager -c "SELECT * FROM pg_stat_activity;"

# Test API health
curl -v http://localhost:3001/api/health

# Test WebSocket connection
docker compose exec backend node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3001');
socket.on('connect', () => { console.log('Connected:', socket.id); });
socket.on('connect_error', (err) => { console.error('Error:', err.message); });
"
```

#### Health Check Endpoints
| Endpoint | Service | Description |
|----------|---------|-------------|
| `/api/health` | Backend | Overall health status |
| `/` | Frontend | Frontend availability |
| `/health` | Nginx | Nginx health (returns 200) |
| `/api/metrics/server` | Backend | Prometheus metrics |

### 10. Maintenance

#### Update Procedure
```bash
# 1. Pull latest code
git pull origin main

# 2. Review changes
git log --oneline HEAD..origin/main

# 3. Update .env if new variables added
# Check for new required env vars

# 4. Rebuild and restart
docker compose up -d --build

# 5. Verify health
curl http://localhost:3001/api/health
curl http://localhost:3000/

# 6. Check logs for errors
docker compose logs --tail=50 backend
```

#### Rollback Procedure
```bash
# 1. Rollback to previous version
git checkout <previous-stable-tag>

# 2. Restart with cached images
docker compose up -d

# 3. If using Docker tags:
docker compose pull
TAG=<previous-version> docker compose up -d

# 4. Restore database if migration caused issues
docker compose exec postgres pg_restore \
  -U postgres -d server_manager \
  --clean \
  /opt/backups/database/pre-migration.dump
```

#### Data Migration Guide
```bash
# 1. Create database backup before migration
./scripts/backup-db.sh

# 2. Run pending migrations
docker compose exec backend npm run migration:run

# 3. Run seeders if needed
docker compose exec backend npm run seed

# 4. Verify data integrity
docker compose exec postgres psql \
  -U postgres -d server_manager \
  -c "SELECT table_name, table_rows FROM information_schema.tables;"
```

#### Monitoring Health
```bash
# Watch all container status
watch docker compose ps

# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Monitor resource usage
docker stats
```

## Production Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Configure domain DNS
- [ ] Obtain SSL certificates
- [ ] Configure firewall (ufw)
- [ ] Set up fail2ban
- [ ] Configure automated backups
- [ ] Set up monitoring alerts
- [ ] Configure log rotation
- [ ] Set memory and CPU limits
- [ ] Enable unattended security updates
- [ ] Configure offsite backup destination
- [ ] Test rollback procedure
- [ ] Document incident response plan
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Run security audit
- [ ] Verify HTTPS redirect
- [ ] Test WebSocket connectivity
- [ ] Verify health check endpoints
- [ ] Load test with expected traffic

## Security Contact

For security issues, contact: security@server-manager.io

## License

This deployment guide is part of the Game Server Manager Platform.
