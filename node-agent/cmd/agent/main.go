package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/radix/node-agent/internal/api"
	"github.com/radix/node-agent/internal/config"
	"github.com/radix/node-agent/internal/docker"
	"github.com/radix/node-agent/internal/websocket"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("[agent] Radix Node Agent starting")

	cfgPath := flag.String("config", "config.json", "path to config JSON file")
	flag.Parse()

	cfg, err := config.Load(*cfgPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[agent] configuration error: %v\n", err)
		os.Exit(1)
	}

	log.Printf("[agent] node_id=%s  control_plane=%s  http=%s", cfg.NodeID, cfg.ControlPlaneURL, cfg.HTTPListenAddr)

	dockerMgr, err := docker.New()
	if err != nil {
		log.Fatalf("[agent] docker init: %v", err)
	}
	defer dockerMgr.Cleanup()

	pCtx, pCancel := context.WithTimeout(context.Background(), 5*time.Second)
	err = dockerMgr.Ping(pCtx)
	pCancel()
	if err != nil {
		log.Printf("[agent] docker ping failed (Docker not running?): %v", err)
		os.Exit(1)
	}
	log.Println("[agent] Docker daemon reachable")

	wsCfg := &websocket.Config{
		ControlPlaneURL: cfg.ControlPlaneURL,
		NodeID:          cfg.NodeID,
		NodeSecret:      cfg.NodeSecret,
		HeartbeatSec:    cfg.HeartbeatSec,
	}

	client := websocket.New(wsCfg, dockerMgr)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	apiServer := api.New(api.Options{
		Addr:       cfg.HTTPListenAddr,
		NodeID:     cfg.NodeID,
		NodeSecret: cfg.NodeSecret,
		TLSCert:    cfg.TLSCertFile,
		TLSKey:     cfg.TLSKeyFile,
		Docker:     dockerMgr,
	})
	apiServer.Start(ctx)

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)

	<-sig
	log.Println("[agent] shutting down...")
	cancel()
	client.Shutdown()
	log.Println("[agent] exited")
}
