# Unity Engine Plugin API Specification

## REST Endpoints

### Get Players
```
GET /api/servers/:id/players
```

### Execute Command
```
POST /api/servers/:id/execute-command
{
  "command": "status"
}
```

### Get Server Metrics
```
GET /api/servers/:id/metrics?hours=24
```

### Get Server Logs
```
GET /api/servers/:id/logs?page=1&limit=50
```

## WebSocket Events (from Unity plugin to panel)

### Player Connected
```json
{
  "event": "player_joined",
  "serverId": "...",
  "player": {
    "playerId": "...",
    "username": "...",
    "ip": "...",
    "ping": 30
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

### Match Analytics
```json
{
  "event": "match_analytics",
  "serverId": "...",
  "matchTime": 3600,
  "totalKills": 150,
  "totalDeaths": 140,
  "topPlayer": "..."
}
```

## Unity Plugin Configuration

The Unity server plugin should be configured with:
- Panel URL: `http://your-panel:3001`
- API Key: `your-jwt-token`
- Server ID: `<server-id-from-panel>`
- Reporting Interval: 5 seconds
