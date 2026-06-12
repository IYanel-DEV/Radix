package config

import (
	"encoding/json"
	"fmt"
	"os"
)

type Config struct {
	ControlPlaneURL string `json:"control_plane_url"`
	NodeID          string `json:"node_id"`
	NodeSecret      string `json:"node_secret"`
	HeartbeatSec    int    `json:"heartbeat_sec"`
	HTTPListenAddr  string `json:"http_listen_addr"`
	TLSCertFile     string `json:"tls_cert_file"`
	TLSKeyFile      string `json:"tls_key_file"`
}

func Load(path string) (*Config, error) {
	cfg := &Config{
		HeartbeatSec:   8,
		HTTPListenAddr: ":9800",
	}

	if path != "" {
		if err := cfg.loadFile(path); err != nil {
			fmt.Fprintf(os.Stderr, "[config] warning: could not load %s — falling back to env\n", path)
		}
	}

	cfg.overrideEnv()
	return cfg, cfg.validate()
}

func (c *Config) loadFile(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return json.NewDecoder(f).Decode(c)
}

func (c *Config) overrideEnv() {
	if v := os.Getenv("RADIX_CONTROL_PLANE_URL"); v != "" {
		c.ControlPlaneURL = v
	}
	if v := os.Getenv("RADIX_NODE_ID"); v != "" {
		c.NodeID = v
	}
	if v := os.Getenv("RADIX_NODE_SECRET"); v != "" {
		c.NodeSecret = v
	}
}

func (c *Config) validate() error {
	if c.ControlPlaneURL == "" {
		return fmt.Errorf("RADIX_CONTROL_PLANE_URL is required")
	}
	if c.NodeID == "" {
		return fmt.Errorf("RADIX_NODE_ID is required")
	}
	if c.NodeSecret == "" {
		return fmt.Errorf("RADIX_NODE_SECRET is required")
	}
	if c.HeartbeatSec < 3 {
		c.HeartbeatSec = 3
	}
	if c.HeartbeatSec > 30 {
		c.HeartbeatSec = 30
	}
	return nil
}
