# Unreal Engine Plugin

Status: Adapter-ready (future plugin required)

The Unreal adapter provides basic process management for Unreal Engine dedicated servers.
Full integration requires a UE-side plugin.

## Current Features

- Start/stop/restart/kill UE server process
- Resource monitoring (CPU, RAM)
- Log capture
- Player count parsing from log output
- UE-specific command-line arguments

## Plugin API (Coming Soon)

The following endpoints are prepared for future UE plugin integration:

```
POST /api/engine-plugins/unreal/players       - Get player list
POST /api/engine-plugins/unreal/match-info    - Get match information
POST /api/engine-plugins/unreal/command       - Execute admin command
POST /api/engine-plugins/unreal/analytics     - Get match analytics
```

## Building a UE Plugin

Create a UE5 plugin that communicates with this panel via HTTP/WebSocket.
The plugin should expose:

- Player join/leave events
- Server performance metrics
- Match state
- Admin command execution
