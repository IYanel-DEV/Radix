package docker

import (
	"fmt"
	"sync"
)

const (
	defaultMinPort = 7000
	defaultMaxPort = 7500
)

type PortPool struct {
	mu      sync.Mutex
	minPort int
	maxPort int
	alloc   map[int]string
}

func NewPortPool(minPort, maxPort int) *PortPool {
	if minPort <= 0 {
		minPort = defaultMinPort
	}
	if maxPort <= minPort {
		maxPort = defaultMaxPort
	}
	return &PortPool{
		minPort: minPort,
		maxPort: maxPort,
		alloc:   make(map[int]string),
	}
}

func (p *PortPool) Allocate(serverID string) (int, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	for port := p.minPort; port <= p.maxPort; port++ {
		if _, taken := p.alloc[port]; !taken {
			p.alloc[port] = serverID
			return port, nil
		}
	}

	return 0, fmt.Errorf("no free port in range %d-%d for %s", p.minPort, p.maxPort, serverID)
}

func (p *PortPool) ReleaseByServerID(serverID string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	for port, sid := range p.alloc {
		if sid == serverID {
			delete(p.alloc, port)
			return
		}
	}
}

func (p *PortPool) ReleasePort(port int) {
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.alloc, port)
}

func (p *PortPool) Lookup(serverID string) (int, bool) {
	p.mu.Lock()
	defer p.mu.Unlock()

	for port, sid := range p.alloc {
		if sid == serverID {
			return port, true
		}
	}
	return 0, false
}

func (p *PortPool) AllocatedCount() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.alloc)
}

func (p *PortPool) Stats() (minPort, maxPort, allocated int) {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.minPort, p.maxPort, len(p.alloc)
}
