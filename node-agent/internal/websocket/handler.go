package websocket

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/radix/node-agent/internal/docker"
)

func (c *Client) handleMessage(msg Message) {
	switch msg.Action {
	case "spawn_container":
		go c.handleSpawn(msg.Payload)
	case "stop_container":
		go c.handleStop(msg.Payload)
	default:
		log.Printf("[ws] unknown action: %s", msg.Action)
	}
}

func (c *Client) handleSpawn(payload interface{}) {
	var sp SpawnPayload
	if err := remap(payload, &sp); err != nil {
		log.Printf("[spawn] invalid payload: %v", err)
		_ = c.sendMessage(Message{
			Action: "container_status_change",
			Payload: StatusChangePayload{
				ServerID: "",
				Status:   "error",
				Error:    "invalid payload",
			},
		})
		return
	}

	log.Printf("[spawn] starting server %s (engine=%s build=%s)", sp.ServerID, sp.Engine, sp.BuildURL)

	ctx, cancel := context.WithTimeout(c.ctx, 120*time.Second)
	defer cancel()

	if sp.EnvVariables == nil {
		sp.EnvVariables = make(map[string]string)
	}

	containerID, hostPort, err := c.docker.SpawnContainer(ctx, sp.ServerID, sp.Engine, sp.Token, sp.BuildURL, sp.ExecutableName, sp.EnvVariables)
	if err != nil {
		log.Printf("[spawn] failed: %v", err)
		_ = c.sendMessage(Message{
			Action: "container_status_change",
			Payload: StatusChangePayload{
				ServerID: sp.ServerID,
				Status:   "error",
				Error:    err.Error(),
			},
		})
		return
	}

	_ = c.sendMessage(Message{
		Action: "container_status_change",
		Payload: StatusChangePayload{
			ServerID:    sp.ServerID,
			Status:      "running",
			ContainerID: containerID,
			HostPort:    hostPort,
		},
	})

	log.Printf("[spawn] streaming logs for %s (%s)", sp.ServerID, containerID)
	lines := make(chan docker.LogLine, 256)
	go func() {
		if err := c.docker.StreamLogs(c.ctx, sp.ServerID, containerID, lines); err != nil {
			log.Printf("[logs] stream ended for %s: %v", sp.ServerID, err)
		}
		close(lines)
	}()

	go c.forwardLogs(sp.ServerID, lines)
}

func (c *Client) handleStop(payload interface{}) {
	var sp StopPayload
	if err := remap(payload, &sp); err != nil {
		log.Printf("[stop] invalid payload: %v", err)
		return
	}

	log.Printf("[stop] stopping server %s", sp.ServerID)

	ctx, cancel := context.WithTimeout(c.ctx, 30*time.Second)
	defer cancel()

	if err := c.docker.StopContainer(ctx, sp.ServerID); err != nil {
		log.Printf("[stop] failed: %v", err)
		_ = c.sendMessage(Message{
			Action: "container_status_change",
			Payload: StatusChangePayload{
				ServerID: sp.ServerID,
				Status:   "error",
				Error:    err.Error(),
			},
		})
		return
	}

	_ = c.sendMessage(Message{
		Action: "container_status_change",
		Payload: StatusChangePayload{
			ServerID: sp.ServerID,
			Status:   "stopped",
		},
	})
}

func (c *Client) forwardLogs(serverID string, lines <-chan docker.LogLine) {
	for line := range lines {
		_ = c.sendMessage(Message{
			Action: "container_log",
			Payload: LogPayload{
				ServerID: line.ServerID,
				Line:     line.Line,
				Stream:   line.Stream,
			},
		})
	}
}

func remap(src, dst interface{}) error {
	data, err := json.Marshal(src)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, dst)
}
