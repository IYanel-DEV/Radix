# Unreal Engine Plugin API Specification

## REST Endpoints

### Get Players
```
GET /api/servers/:id/players
```
Returns list of connected players.

### Execute Command
```
POST /api/servers/:id/execute-command
{
  "command": "AdminPlayerList"
}
```

### Get Server Metrics
```
GET /api/servers/:id/metrics?hours=24
```

## WebSocket Events (from UE plugin to panel)

### Player Connected
```json
{
  "event": "player_joined",
  "serverId": "...",
  "player": {
    "steamId": "...",
    "username": "...",
    "ip": "...",
    "ping": 45
  }
}
```

### Player Disconnected
```json
{
  "event": "player_left",
  "serverId": "...",
  "playerId": "...",
  "username": "..."
}
```

### Server Metrics
```json
{
  "event": "server_metric",
  "serverId": "...",
  "cpuUsage": 45.2,
  "ramUsage": 2048,
  "playerCount": 12,
  "tickRate": 60,
  "fps": 120
}
```

## UE Plugin Configuration

The UE plugin should be configured with:
- Panel URL: `http://your-panel:3001`
- API Key: `your-jwt-token`
- Server ID: `<server-id-from-panel>`
