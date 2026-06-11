# Godot Engine Plugin

Status: Built-in (fully functional)

The Godot adapter provides complete process management for Godot dedicated server builds.

## Supported Actions

- Start server with `--headless --server` flags
- Stop server (graceful + force kill)
- Restart server
- Kill server process
- Real-time resource monitoring (CPU, RAM)
- Log capture (stdout/stderr)
- Command execution via stdin

## Usage

Create a server with `engineType: "godot"` and provide the path to your Godot dedicated server executable.

## Future Plugin Features

The engine adapter architecture supports future Godot plugin integration for:
- Player list retrieval
- In-game metrics
- Match state
