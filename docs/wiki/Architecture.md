# Architecture

## System Overview

```
                        ┌──────────────────────────────────────┐
                        │           Radix Dashboard            │
                        │         (Next.js / React)            │
                        │              :3000                   │
                        └──────────┬───────────────────────────┘
                                   │ HTTP / WebSocket
                                   ▼
                        ┌──────────────────────────────────────┐
                        │         Radix API Gateway            │
                        │         (NestJS / Express)           │
                        │              :3001                   │
                        └─────┬──────────────┬─────────────────┘
                              │              │
                 ┌────────────▼──┐    ┌──────▼──────────────┐
                 │  PostgreSQL   │    │   Game Servers      │
                 │  / SQLite     │    │  (Child Processes)  │
                 │  (TypeORM)    │    │  stdin/stdout pipes │
                 └───────────────┘    └─────────────────────┘
```

## Backend (NestJS)

### Module Structure

```
src/
├── main.ts                          # Entry point, bootstrap
├── app.module.ts                    # Root module
├── config/                          # Configuration providers
│   ├── app.config.ts
│   ├── database.config.ts           # TypeORM (PostgreSQL / SQLjs)
│   └── jwt.config.ts                # JWT signing config
├── common/                          # Shared utilities
│   ├── decorators/                  # @CurrentUser, @Public, @Roles
│   ├── filters/                     # Exception filters
│   ├── guards/                      # JWT auth, RBAC, server-token
│   ├── interceptors/                # Logging, transform wrappers
│   └── pipes/                       # Validation
├── database/
│   ├── entities/                    # TypeORM entity models
│   └── seeds/                       # Role & admin user seeders
├── modules/
│   ├── auth/                        # Login, register, JWT tokens
│   ├── users/                       # User management
│   ├── admin/                       # Admin CRUD
│   ├── roles/                       # RBAC & permissions
│   ├── servers/                     # Server lifecycle, adapters
│   ├── players/                     # Player tracking
│   ├── bans/                        # Ban management
│   ├── logs/                        # Centralized log storage
│   ├── metrics/                     # Prometheus metrics
│   ├── analytics/                   # System analytics
│   ├── audit/                       # Audit trail
│   ├── notifications/               # In-app notifications
│   ├── configuration/               # Server config templates
│   ├── deployment/                  # Deployment pipeline
│   ├── engine-plugins/              # Engine adapter registry
│   ├── plugin/                      # Plugin system
│   └── health/                      # Health check endpoint
└── websocket/                       # Socket.IO gateway
```

### Request Lifecycle

```
Client Request
     │
     ▼
Authentication Guard (JWT validation)
     │
     ▼
Roles Guard (RBAC permission check)
     │
     ▼
Validation Pipe (class-validator DTOs)
     │
     ▼
Controller (route handler)
     │
     ▼
Service (business logic)
     │
     ▼
TypeORM Repository (database)
     │
     ▼
Transform Interceptor (wraps response in { statusCode, message, data })
     │
     ▼
Response
```

## Frontend (Next.js 14)

### Route Structure

```
src/app/
├── layout.tsx                       # Root layout (Inter font, Providers)
├── page.tsx                         # Landing/redirect
├── (auth)/                          # Auth group
│   ├── layout.tsx                   # Auth layout (centered card)
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
├── (dashboard)/                     # Dashboard group
│   ├── layout.tsx                   # DashboardLayout wrapper
│   ├── dashboard/page.tsx           # Main dashboard
│   ├── servers/                     # Server management
│   │   ├── page.tsx                 # Server list
│   │   ├── [id]/page.tsx            # Server detail
│   │   └── create/page.tsx          # Server creation wizard
│   ├── players/
│   ├── bans/
│   ├── builds/
│   ├── analytics/
│   ├── logs/
│   ├── admins/
│   └── settings/
├── api/auth/                        # Next.js API routes (token refresh)
│   ├── login/route.ts
│   ├── logout/route.ts
│   └── refresh/route.ts
└── globals.css                      # Global styles
```

### Component Architecture

```
Layout
├── Sidebar
│   ├── Logo (logov2.png)
│   ├── Nav items (Dashboard, Servers, Players, etc.)
│   ├── Server online count
│   └── Collapse toggle
├── Topbar
│   ├── Mobile menu trigger
│   ├── Search input
│   ├── Notification bell (Popover)
│   └── User dropdown (Avatar + DropdownMenu)
└── Main content
    └── Page-specific components
```

### State Management (Zustand)

| Store | Purpose |
|-------|---------|
| `auth-store` | Authentication state, tokens, user profile |
| `server-store` | Server list, current server, logs, metrics |
| `builds-store` | Build inventory |
| `notification-store` | In-app notifications, unread count |

## WebSocket Architecture

```
Socket.IO Gateway (:3001)
    │
    ├── Events:
    │   ├── subscribe:server    → Joins a server room
    │   ├── subscribe:logs      → Subscribes to log stream
    │   ├── subscribe:metrics   → Subscribes to metric updates
    │   ├── send:command        → Sends command to server stdin
    │   └── disconnect          → Cleans up subscriptions
    │
    └── Server emissions:
        ├── server:status       → Status change notification
        ├── server:log          → New log line
        ├── server:metric       → Resource metric update
        └── server:error        → Error event
```

## Database Schema (Key Entities)

- **User** — Authentication, roles, permissions
- **Role** — RBAC role definitions
- **Permission** — Granular permission flags
- **Server** — Game server instances (status, port, region, build ref)
- **ServerBuild** — Uploaded build versions
- **ServerMetric** — CPU/RAM tick data points
- **Player** — Connected player records
- **PlayerStat** — Per-player statistics
- **Ban** — Player ban records with expiry
- **AuditLog** — Admin action audit trail
- **Notification** — In-app notification queue
- **Backup** — Server backup manifest
- **ServerLog** — Persistent log storage
- **ServerConfig** — Server configuration templates
