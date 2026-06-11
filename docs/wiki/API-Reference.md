# API Reference

## Authentication

All API requests (except auth endpoints) require a Bearer JWT token in the `Authorization` header.

```
Authorization: Bearer <accessToken>
```

### Token Refresh

When the access token expires, use the refresh token:

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refreshToken>"
}
```

Response:

```json
{
  "statusCode": 200,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "<newAccessToken>",
    "refreshToken": "<newRefreshToken>"
  }
}
```

---

## Endpoints

### Auth

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Register new account | No |
| POST | `/api/auth/login` | Login | No |
| POST | `/api/auth/refresh` | Refresh tokens | No |
| POST | `/api/auth/logout` | Logout | Yes |
| POST | `/api/auth/forgot-password` | Request password reset | No |
| POST | `/api/auth/reset-password` | Reset password with token | No |
| GET | `/api/auth/me` | Get current user profile | Yes |

#### POST `/api/auth/login`

```json
{
  "username": "admin",
  "password": "admin123456"
}
```

Response:

```json
{
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@radix.local",
      "role": { "name": "Super Admin" }
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### Servers

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/servers` | List all servers | Yes |
| GET | `/api/servers/:id` | Get server details | Yes |
| POST | `/api/servers` | Create server (JSON) | Yes |
| POST | `/api/servers/create-with-zip` | Create server from ZIP upload | Yes |
| PATCH | `/api/servers/:id` | Update server | Yes |
| DELETE | `/api/servers/:id` | Delete server | Yes |
| POST | `/api/servers/:id/start` | Start server | Yes |
| POST | `/api/servers/:id/stop` | Stop server | Yes |
| POST | `/api/servers/:id/restart` | Restart server | Yes |
| POST | `/api/servers/:id/kill` | Force kill server | Yes |
| GET | `/api/servers/:id/logs` | Get server logs | Yes |
| GET | `/api/servers/:id/metrics` | Get server metrics | Yes |

#### POST `/api/servers/create-with-zip`

Multipart form data:

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | `.zip` containing game server build |
| `name` | string | Server display name |
| `engineType` | string | `godot`, `unity`, or `unreal` |
| `port` | number | Game port (1024–65535) |
| `queryPort` | number | Query port (1024–65535) |
| `maxPlayers` | number | Max concurrent players |
| `region` | string | Deployment region |
| `password` | string | Server join password (optional) |

---

### Players

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/players` | List players | Yes |
| GET | `/api/players/:id` | Get player details | Yes |
| PATCH | `/api/players/:id` | Update player | Yes |
| DELETE | `/api/players/:id` | Delete player | Yes |

---

### Bans

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/bans` | List bans | Yes |
| POST | `/api/bans` | Create ban | Yes |
| PATCH | `/api/bans/:id` | Update ban | Yes |
| DELETE | `/api/bans/:id` | Remove ban | Yes |

---

### Users / Admins

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/users` | List users (admin) | Admin |
| GET | `/api/users/:id` | Get user details | Admin |
| PATCH | `/api/users/:id` | Update user | Admin |
| DELETE | `/api/users/:id` | Delete user | Admin |
| GET | `/api/admin/staff` | List staff members | Admin |
| POST | `/api/admin/staff` | Create staff member | Admin |

---

### Builds

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/builds` | List builds | Yes |
| POST | `/api/builds/upload` | Upload new build | Yes |
| PATCH | `/api/builds/:id` | Update build | Yes |
| DELETE | `/api/builds/:id` | Delete build | Yes |

---

### Logs

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/logs` | Query logs | Yes |
| GET | `/api/logs/:id` | Get log entry | Yes |

---

### Metrics & Health

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | System health check | No |
| GET | `/api/metrics/server` | Prometheus metrics | Yes |
| GET | `/api/analytics/dashboard` | Dashboard statistics | Yes |

---

## WebSocket Events

### Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: '<accessToken>' }
});
```

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe:server` | `{ serverId: string }` | Join server events room |
| `subscribe:logs` | `{ serverId: string }` | Subscribe to log stream |
| `subscribe:metrics` | `{ serverId: string }` | Subscribe to metric updates |
| `send:command` | `{ serverId: string, command: string }` | Send stdin command |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `server:status` | `{ serverId, status }` | Status change |
| `server:log` | `{ level, message, timestamp }` | New log line |
| `server:metric` | `{ cpuUsage, ramUsage, tickRate, networkIn, networkOut }` | Resource update |
| `server:error` | `{ message }` | Error event |

---

## Response Format

All responses are wrapped in a standard envelope:

```json
{
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... }
}
```

Error responses:

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "data": null,
  "timestamp": "2026-06-11T12:00:00.000Z"
}
```
