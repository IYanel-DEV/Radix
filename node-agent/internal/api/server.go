package api

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/radix/node-agent/internal/docker"
)

const (
	shutdownTimeout = 5 * time.Second
)

type Server struct {
	srv        *http.Server
	docker     *docker.Manager
	nodeID     string
	nodeSecret string
	tlsCert    string
	tlsKey     string
}

type Options struct {
	Addr       string
	NodeID     string
	NodeSecret string
	TLSCert    string
	TLSKey     string
	Docker     *docker.Manager
}

func New(opts Options) *Server {
	mux := http.NewServeMux()
	s := &Server{
		srv: &http.Server{
			Addr:         opts.Addr,
			Handler:      mux,
			ReadTimeout:  10 * time.Second,
			WriteTimeout: 30 * time.Second,
			IdleTimeout:  60 * time.Second,
		},
		docker:     opts.Docker,
		nodeID:     opts.NodeID,
		nodeSecret: opts.NodeSecret,
		tlsCert:    opts.TLSCert,
		tlsKey:     opts.TLSKey,
	}

	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/api/v1/spawn", s.auth(s.handleSpawn))
	mux.HandleFunc("/api/v1/stop", s.auth(s.handleStop))
	mux.HandleFunc("/api/v1/servers", s.auth(s.handleListServers))
	mux.HandleFunc("/api/v1/ports", s.auth(s.handlePortStatus))

	return s
}

func (s *Server) Start(ctx context.Context) {
	go func() {
		var err error
		if s.tlsCert != "" && s.tlsKey != "" {
			log.Printf("[api] HTTPS API listening on %s (TLS)", s.srv.Addr)
			err = s.srv.ListenAndServeTLS(s.tlsCert, s.tlsKey)
		} else {
			log.Printf("[api] HTTP API listening on %s (no TLS — set tls_cert/tls_key for HTTPS)", s.srv.Addr)
			err = s.srv.ListenAndServe()
		}
		if err != nil && err != http.ErrServerClosed {
			log.Printf("[api] listen error: %v", err)
		}
	}()

	go func() {
		<-ctx.Done()
		log.Println("[api] shutting down HTTP server")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()
		_ = s.srv.Shutdown(shutdownCtx)
	}()
}

func (s *Server) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		if token == "" {
			http.Error(w, `{"error":"missing Authorization header"}`, http.StatusUnauthorized)
			return
		}
		if subtle.ConstantTimeCompare([]byte(token), []byte("Bearer "+s.nodeSecret)) != 1 {
			http.Error(w, `{"error":"invalid token"}`, http.StatusForbidden)
			return
		}
		next(w, r)
	}
}

func (s *Server) respond(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v != nil {
		if err := json.NewEncoder(w).Encode(v); err != nil {
			log.Printf("[api] encode error: %v", err)
		}
	}
}

func (s *Server) respondError(w http.ResponseWriter, status int, msg string) {
	s.respond(w, status, map[string]string{"error": msg})
}
