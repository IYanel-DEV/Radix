# Radix — System Requirements & Prerequisites

> **Minimum infrastructure needed to host the Radix multi-engine game server orchestrator.**

---

## 1. Software & Environment Dependencies

### Runtime
| Dependency | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | LTS v20.x+ | JavaScript runtime for NestJS backend & Next.js frontend |
| **npm** | v10.x+ | Package management & build scripts |
| **Git** | Any modern release | Code versioning, repository tracking |

### Database
| Engine | Version | Purpose |
|--------|---------|---------|
| **PostgreSQL** | v15+ | Primary data store — TypeORM schemas, server state, logs, indices |

> **Note:** Radix includes an automatic sqljs fallback when PostgreSQL is unreachable. This is intended for local dev only — production deployments **must** run PostgreSQL.

### Build & Deployment Tooling (optional but recommended)
- Docker & Docker Compose (containerized deployment)
- PM2 or systemd (production process management)

---

## 2. Operating System & Process Execution Requirements

### Supported Platforms
| OS | Use Case |
|----|----------|
| **Linux** — Ubuntu 22.04 LTS, Debian 12 | **Recommended** for headless production server execution |
| **Windows** — Server 2022, Windows 10/11 | Local development, testing, game client loop verification |

### File System Permissions
The system user (or daemon account) running the NestJS process must have **read / write / execute** permissions on the following directories:

```
radix/
├── uploads/          # Zip upload extraction & staging
├── data/             # Runtime data, database files (sqljs fallback)
├── dist/             # Compiled backend output
├── node_modules/     # Dependency tree
└── .next/            # Compiled frontend output
```

Failure to set correct ownership will cause:
- Silent `EPERM` errors during zip extraction
- `ENOENT` / `EACCES` failures when spawning game server binaries

### Engine Binary Dependencies
Radix launches headless dedicated server binaries via `child_process.spawn`. Each engine may require system-level libraries:

| Engine | Linux Dependencies | Windows Dependencies |
|--------|--------------------|----------------------|
| **Godot** | `libGL.so.1`, `libX11.so.6`, `libpthread.so.0`, `libfreetype.so.6` | Visual C++ Redistributable (x64) |
| **Unity** | `libc6` (glibc ≥ 2.31), `libstdc++6`, `libicu` | Visual C++ Redistributable (x64), DirectX Runtime |
| **Unreal** | `libc6` (glibc ≥ 2.35), `libstdc++6`, `libicu`, `zlib1g` | Visual C++ Redistributable (x64), DirectX Runtime |

Install missing libraries on Ubuntu/Debian:
```bash
sudo apt update
sudo apt install -y libgl1-mesa-glx libx11-6 libfreetype6 libicu-dev libstdc++6 zlib1g
```

---

## 3. Networking & Firewall Allocations

### Port Configuration
The following ports **must be unblocked** in local firewalls (Windows Defender, `ufw`, `iptables`) and cloud security groups (AWS SG, GCP FW, Azure NSG):

| Port | Protocol | Service | Configurable? |
|------|----------|---------|---------------|
| `3000` | TCP | NestJS REST API + WebSocket (Socket.IO) | Yes — `BACKEND_PORT` env |
| `3001` | TCP | Next.js frontend (dev mode) | Yes — `FRONTEND_PORT` env |
| `5432` | TCP | PostgreSQL (external, if not on same host) | Yes — `DB_PORT` env |
| `27015-27050` | UDP/TCP | Dynamic game server ports (Godot, Unity, Unreal) | Yes — per-server config |

> **Cloud security groups:** For production, restrict ports `3000` and `3001` to known reverse proxy / load balancer CIDRs. Game server ports should be open to `0.0.0.0/0` (UDP) only on dedicated game-server subnets.

### Example — `ufw` rules (Ubuntu)
```bash
sudo ufw allow 3000/tcp comment 'Radix API'
sudo ufw allow 3001/tcp comment 'Radix Frontend'
sudo ufw allow 27015:27050/udp comment 'Game Servers'
```

### Example — `iptables` rules
```bash
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 27015:27050 -j ACCEPT
```

---

## 4. Hardware Guidelines

| Tier | vCPU | RAM | Storage | Expected Workload |
|------|------|-----|---------|-------------------|
| **Development** | 2 vCPU | 4 GB | 20 GB SSD | 1–2 local game servers, code iteration |
| **Production (small)** | 4 vCPU | 8 GB | 50 GB SSD | 3–5 concurrent game servers, light traffic |
| **Production (medium)** | 8 vCPU | 16 GB | 100 GB SSD | 10–15 concurrent game servers, moderate traffic |
| **Production (large)** | 16+ vCPU | 32+ GB | 200+ GB SSD | 20+ game servers, high traffic / multiple engines |

Storage estimates assume ~500 MB–2 GB per extracted game build plus logs and metrics history.

---

## 5. Environment Variables

Copy the provided `.env.example` files and populate all fields:

### Backend (`backend/.env`)
```
BACKEND_PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=radix
DB_PASSWORD=<strong-password>
DB_NAME=radix
JWT_SECRET=<min-32-char-secret>
```

### Frontend (`frontend/.env`)
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

> **Security:** Never commit `.env` files. Radix's `.gitignore` blocks all `.env*` patterns by default.

---

## Quick Verification Script

Run the following to confirm the environment is ready:

```bash
node --version      # ≥ v20.x
npm --version       # ≥ v10.x
git --version       # any modern release
psql --version      # ≥ v15 (if using PostgreSQL)
```

---

*Radix — Apache 2.0 Licensed. See [LICENSE](LICENSE) for terms.*
