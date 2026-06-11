# Unity Engine Plugin

Status: Adapter-ready (future plugin required)

The Unity adapter provides basic process management for Unity dedicated server builds.
Full integration requires a Unity-side plugin.

## Current Features

- Start/stop/restart/kill Unity server process with `-batchmode -nographics`
- Resource monitoring (CPU, RAM)
- Log capture
- Unity-specific command-line arguments

## Plugin API (Coming Soon)

The following endpoints are prepared for future Unity plugin integration:

```
POST /api/engine-plugins/unity/players      - Get player list
POST /api/engine-plugins/unity/analytics    - Get analytics
POST /api/engine-plugins/unity/command      - Execute command
POST /api/engine-plugins/unity/match-state  - Get match state
```

## Building a Unity Plugin

Create a Unity dedicated server build that communicates with this panel via HTTP/WebSocket.
The plugin should expose:

- Player join/leave events
- Server performance analytics
- Match state information
- Command execution
