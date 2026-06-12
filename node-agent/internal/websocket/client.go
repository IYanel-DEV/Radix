package websocket

import (
	"context"
	"fmt"
	"log"
	"math"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/radix/node-agent/internal/docker"
)

const (
	writeWait     = 10 * time.Second
	maxRetryDelay = 60 * time.Second
	baseRetryWait = 1 * time.Second
)

type Client struct {
	cfg *Config

	conn      *websocket.Conn
	connMu    sync.Mutex
	sendCh    chan []byte

	docker   DockerManager
	hostname string

	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup

	heartbeatStarted bool
	hbMu             sync.Mutex
}

type Config struct {
	ControlPlaneURL string
	NodeID          string
	NodeSecret      string
	HeartbeatSec    int
}

type DockerManager interface {
	SpawnContainer(ctx context.Context, serverID, engine, token string, buildUrl, executableName string, envVars map[string]string) (containerID string, hostPort int, err error)
	StopContainer(ctx context.Context, serverID string) error
	StreamLogs(ctx context.Context, serverID, containerID string, lines chan<- docker.LogLine) error
	ListActiveServerIDs(ctx context.Context) ([]string, error)
	Cleanup()
}

func New(cfg *Config, dock DockerManager) *Client {
	ctx, cancel := context.WithCancel(context.Background())
	return &Client{
		cfg:      cfg,
		sendCh:   make(chan []byte, 256),
		docker:   dock,
		hostname: cfg.NodeID,
		ctx:      ctx,
		cancel:   cancel,
	}
}

func (c *Client) Run() {
	defer c.docker.Cleanup()

	for c.ctx.Err() == nil {
		c.connect()
		if c.ctx.Err() != nil {
			return
		}
		delay := baseRetryWait
		for attempt := 0; c.ctx.Err() == nil; attempt++ {
			log.Printf("[ws] reconnecting in %v (attempt %d)", delay, attempt+1)
			select {
			case <-time.After(delay):
			case <-c.ctx.Done():
				return
			}
			delay = time.Duration(math.Min(
				float64(delay)*2,
				float64(maxRetryDelay),
			))
			if c.ctx.Err() == nil {
				break
			}
		}
	}
}

func (c *Client) Shutdown() {
	c.cancel()
	c.connMu.Lock()
	if c.conn != nil {
		c.conn.Close()
	}
	c.connMu.Unlock()
	c.wg.Wait()
}

func (c *Client) connect() {
	c.connMu.Lock()
	if c.conn != nil {
		c.conn.Close()
	}
	c.connMu.Unlock()

	u := c.cfg.ControlPlaneURL
	header := map[string][]string{
		"x-node-token": {c.cfg.NodeSecret},
		"x-node-id":    {c.cfg.NodeID},
	}

	log.Printf("[ws] dialing %s with node %s", u, c.cfg.NodeID)
	conn, _, err := websocket.DefaultDialer.Dial(u, header)
	if err != nil {
		log.Printf("[ws] dial error: %v", err)
		return
	}

	c.connMu.Lock()
	c.conn = conn
	c.connMu.Unlock()

	log.Printf("[ws] connected as %s", c.cfg.NodeID)

	c.wg.Add(1)
	go c.readPump()

	c.wg.Add(1)
	go c.writePump()

	c.hbMu.Lock()
	if !c.heartbeatStarted {
		c.heartbeatStarted = true
		c.wg.Add(1)
		go c.heartbeatLoop()
	}
	c.hbMu.Unlock()

	_ = c.sendMessage(Message{
		Action: "node_connected",
		Payload: map[string]interface{}{
			"nodeId": c.cfg.NodeID,
		},
	})
}

func (c *Client) readPump() {
	defer c.wg.Done()
	defer func() {
		c.connMu.Lock()
		if c.conn != nil {
			c.conn.Close()
		}
		c.connMu.Unlock()
	}()

	for c.ctx.Err() == nil {
		c.connMu.Lock()
		conn := c.conn
		c.connMu.Unlock()
		if conn == nil {
			return
		}

		_, raw, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("[ws] read error: %v", err)
			}
			return
		}

		msg, err := parseMessage(raw)
		if err != nil {
			log.Printf("[ws] malformed message: %v", err)
			continue
		}

		c.handleMessage(msg)
	}
}

func (c *Client) writePump() {
	defer c.wg.Done()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case msg, ok := <-c.sendCh:
			if !ok {
				return
			}
			c.connMu.Lock()
			conn := c.conn
			c.connMu.Unlock()
			if conn == nil {
				continue
			}
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				log.Printf("[ws] write error: %v", err)
				return
			}
		case <-ticker.C:
			c.connMu.Lock()
			conn := c.conn
			c.connMu.Unlock()
			if conn == nil {
				continue
			}
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		case <-c.ctx.Done():
			return
		}
	}
}

func (c *Client) sendMessage(msg Message) error {
	data, err := msg.Marshal()
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}
	select {
	case c.sendCh <- data:
	case <-c.ctx.Done():
	}
	return nil
}

func (c *Client) SendJSON(v interface{}) error {
	data, err := marshalJSON(v)
	if err != nil {
		return err
	}
	select {
	case c.sendCh <- data:
	case <-c.ctx.Done():
	}
	return nil
}
