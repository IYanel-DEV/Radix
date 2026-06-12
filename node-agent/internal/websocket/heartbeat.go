package websocket

import (
	"context"
	"log"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
)

func (c *Client) heartbeatLoop() {
	defer c.wg.Done()

	if c.cfg.HeartbeatSec <= 0 {
		c.cfg.HeartbeatSec = 8
	}
	ticker := time.NewTicker(time.Duration(c.cfg.HeartbeatSec) * time.Second)
	defer ticker.Stop()

	// emit one immediately on connect
	c.emitHeartbeat()

	for {
		select {
		case <-ticker.C:
			c.emitHeartbeat()
		case <-c.ctx.Done():
			return
		}
	}
}

func (c *Client) emitHeartbeat() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cpuPercents, err := cpu.PercentWithContext(ctx, 0)
	if err != nil {
		log.Printf("[heartbeat] cpu error: %v", err)
		cpuPercents = []float64{0}
	}

	memInfo, err := virtualMemoryWithContext(ctx)
	if err != nil {
		log.Printf("[heartbeat] mem error: %v", err)
		memInfo = &VirtualMemoryStat{Total: 0, Used: 0, Free: 0}
	}

	payload := HeartbeatPayload{
		NodeID:        c.cfg.NodeID,
		CPUPercent:    cpuPercents[0],
		MemoryTotalMB: memInfo.Total / 1024 / 1024,
		MemoryUsedMB:  memInfo.Used / 1024 / 1024,
		MemoryFreeMB:  memInfo.Free / 1024 / 1024,
	}

	_ = c.sendMessage(Message{
		Action:  "node_heartbeat",
		Payload: payload,
	})
}

type VirtualMemoryStat struct {
	Total uint64
	Used  uint64
	Free  uint64
}

func virtualMemoryWithContext(ctx context.Context) (*VirtualMemoryStat, error) {
	v, err := mem.VirtualMemoryWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return &VirtualMemoryStat{
		Total: v.Total,
		Used:  v.Used,
		Free:  v.Free,
	}, nil
}
