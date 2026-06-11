# Engine Adapters

## Overview

Radix uses a modular **engine adapter** system to support multiple game engines through a unified interface. Each engine has a dedicated adapter that handles:

- **Binary discovery** — Finding the correct executable in an uploaded ZIP
- **Startup arguments** — Generating engine-specific CLI flags
- **Process management** — Handling engine-specific lifecycle events
- **Plugin API** — Communication with engine-side game logic plugins

## Currently Supported Engines

| Engine | Adapter | Binary Detection | Status |
|--------|---------|-----------------|--------|
| **Godot** | `godot-adapter.ts` | `*.server.x86_64`, `server.console.exe`, `*.pck` | ✅ Stable |
| **Unity** | `unity-adapter.ts` | `*_Data/`, `server.console.exe`, Unity DLLs | ✅ Stable |
| **Unreal** | `unreal-adapter.ts` | `GameServer.exe`, `GameServer-Linux-Shipping` | ✅ Stable |

---

## Architecture

```
                    ┌─────────────────────────────┐
                    │    EngineAdapterFactory      │
                    │  (detects engine from ZIP)   │
                    └──────────┬──────────────────┘
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  Godot   │   │  Unity   │   │  Unreal  │
        │ Adapter  │   │ Adapter  │   │ Adapter  │
        └────┬─────┘   └────┬─────┘   └────┬─────┘
             │              │              │
             ▼              ▼              ▼
        ┌──────────────────────────────────────┐
        │        BaseProcessAdapter            │
        │  (child_process.spawn, stdin/stdout) │
        └──────────────────────────────────────┘
```

### Interface

Every engine adapter implements:

```typescript
interface EngineAdapter {
  /** Detect if this engine can handle the extracted file tree */
  detect(files: string[]): boolean;

  /** Discover the main executable binary */
  discoverExecutable(files: string[]): string | null;

  /** Build CLI arguments for spawning */
  buildArgs(config: ServerConfig): string[];

  /** Environment variables for the process */
  buildEnv(config: ServerConfig): Record<string, string>;

  /** Post-start validation */
  validateStart(pid: number): Promise<boolean>;
}
```

---

## Godot Adapter

### Binary Discovery

Scans the extracted directory for, in order of priority:

1. `*.linuxbsd.server.x86_64` (Linux dedicated server)
2. `*.windows.server.x86_64.exe` (Windows dedicated server)
3. `*.server.console.exe` (Windows console server)
4. `*.x86_64` (fallback binary)
5. `*.pck` (asset package — used as indicator)

### Startup Command

```bash
./godot-server --headless --server --port 7777 --max-players 50
```

### WebSocket Plugin

The Godot adapter includes a **WebSocket plugin** (GDScript) that connects back to Radix for:

- Status reporting (`server_ready`, `player_joined`, `player_left`)
- Metric reporting (player count, tick rate)
- Command relay (admin commands from dashboard)

---

## Unity Adapter

### Binary Discovery

Scans for:

1. `server.console.exe` (Windows)
2. `*_Data/Managed/` directory (indicator of Unity build)
3. Executable matching project name in build config

### Startup Command

```bash
./unity-server -batchmode -nographics -port 7777 -players 50
```

### Plugin API

Unity adapter uses a **file-based IPC** mechanism:

| File | Direction | Description |
|------|-----------|-------------|
| `radix_commands.txt` | Radix → Game | Admin commands from dashboard |
| `radix_metrics.txt` | Game → Radix | CPU, RAM, player count updates |

---

## Unreal Adapter

### Binary Discovery

Scans for:

1. `GameServer.exe` (Windows)
2. `GameServer-Linux-Shipping` (Linux)
3. `Engine/Binaries/` directory (indicator of Unreal build)

### Startup Command

```bash
./GameServer /Game/Maps/DefaultMap?Port=7777?MaxPlayers=50 -server -log
```

### Plugin API

Unreal adapter uses **console commands** piped via `stdin` for administration and a **log parser** for metrics extraction.

---

## Adding a New Engine

1. Create a new adapter file in `src/modules/servers/adapters/<engine>/`
2. Implement the `EngineAdapter` interface
3. Register the adapter in `engine-adapter.factory.ts`
4. Add known binary signatures for auto-detection
5. Add engine option to the frontend creation form
