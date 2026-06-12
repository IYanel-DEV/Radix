package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/radix/node-agent/internal/docker"
)

type spawnRequest struct {
	ServerID       string            `json:"serverId"`
	Engine         string            `json:"engine"`
	Token          string            `json:"token"`
	BuildURL       string            `json:"buildUrl"`
	ExecutableName string            `json:"executableName"`
	EnvVariables   map[string]string `json:"envVariables,omitempty"`
}

type spawnResponse struct {
	ServerID    string `json:"serverId"`
	ContainerID string `json:"containerId"`
	HostPort    int    `json:"hostPort"`
	Status      string `json:"status"`
}

type stopRequest struct {
	ServerID string `json:"serverId"`
}

type stopResponse struct {
	ServerID string `json:"serverId"`
	Status   string `json:"status"`
}

type serverEntry struct {
	ServerID    string `json:"serverId"`
	ContainerID string `json:"containerId"`
	Port        int    `json:"port,omitempty"`
}

type portStatusResponse struct {
	MinPort       int            `json:"minPort"`
	MaxPort       int            `json:"maxPort"`
	Allocated     int            `json:"allocated"`
	Free          int            `json:"free"`
	Allocations   map[string]int `json:"allocations,omitempty"`
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	s.respond(w, http.StatusOK, map[string]interface{}{
		"status":   "ok",
		"nodeId":   s.nodeID,
		"addr":     s.srv.Addr,
		"uptime":   time.Now().Unix(),
	})
}

func (s *Server) handleSpawn(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		s.respondError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req spawnRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.respondError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if req.ServerID == "" || req.Engine == "" || req.BuildURL == "" {
		s.respondError(w, http.StatusBadRequest, "serverId, engine, buildUrl are required")
		return
	}

	if req.EnvVariables == nil {
		req.EnvVariables = make(map[string]string)
	}

	log.Printf("[api] spawn request: server=%s engine=%s build=%s", req.ServerID, req.Engine, req.BuildURL)

	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()

	containerID, hostPort, err := s.docker.SpawnContainer(ctx, req.ServerID, req.Engine, req.Token, req.BuildURL, req.ExecutableName, req.EnvVariables)
	if err != nil {
		log.Printf("[api] spawn failed for %s: %v", req.ServerID, err)
		s.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	log.Printf("[api] spawn ok: server=%s container=%s port=%d", req.ServerID, containerID[:12], hostPort)

	s.respond(w, http.StatusCreated, spawnResponse{
		ServerID:    req.ServerID,
		ContainerID: containerID,
		HostPort:    hostPort,
		Status:      "running",
	})
}

func (s *Server) handleStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		s.respondError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req stopRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.respondError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if req.ServerID == "" {
		s.respondError(w, http.StatusBadRequest, "serverId is required")
		return
	}

	log.Printf("[api] stop request: server=%s", req.ServerID)

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := s.docker.StopContainer(ctx, req.ServerID); err != nil {
		log.Printf("[api] stop failed for %s: %v", req.ServerID, err)
		s.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	log.Printf("[api] stop ok: server=%s", req.ServerID)

	s.respond(w, http.StatusOK, stopResponse{
		ServerID: req.ServerID,
		Status:   "stopped",
	})
}

func (s *Server) handleListServers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.respondError(w, http.StatusMethodNotAllowed, "GET required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	ids, err := s.docker.ListActiveServerIDs(ctx)
	if err != nil {
		log.Printf("[api] list servers error: %v", err)
		s.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	entries := make([]serverEntry, 0, len(ids))
	for _, id := range ids {
		port, found := s.docker.LookupPort(id)
		entry := serverEntry{ServerID: id}
		if found {
			entry.Port = port
		}
		entries = append(entries, entry)
	}

	log.Printf("[api] list servers: %d active", len(entries))
	s.respond(w, http.StatusOK, map[string]interface{}{
		"count":   len(entries),
		"servers": entries,
	})
}

func (s *Server) handlePortStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.respondError(w, http.StatusMethodNotAllowed, "GET required")
		return
	}

	minP, maxP, allocated := s.docker.PortPoolStats()

	s.respond(w, http.StatusOK, portStatusResponse{
		MinPort:     minP,
		MaxPort:     maxP,
		Allocated:   allocated,
		Free:        (maxP - minP + 1) - allocated,
	})
}
