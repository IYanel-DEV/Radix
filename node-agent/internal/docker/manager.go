package docker

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
)

const (
	labelServerID  = "radix-server-id"
	cpuLimit       = 1.5
	memoryLimitMB  = 2048
	serverDataRoot = "./data/servers"
)

type Manager struct {
	cli    *client.Client
	wg     sync.WaitGroup
	cancel context.CancelFunc
	ctx    context.Context
	pool   *PortPool
}

var engineImages = map[string]string{
	"godot":  "radix/godot-server:latest",
	"unity":  "radix/unity-server:latest",
	"unreal": "radix/unreal-server:latest",
}

func New() (*Manager, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv)
	if err != nil {
		return nil, fmt.Errorf("docker client: %w", err)
	}
	cli.NegotiateAPIVersion(context.Background())

	ctx, cancel := context.WithCancel(context.Background())
	return &Manager{
		cli:    cli,
		ctx:    ctx,
		cancel: cancel,
		pool:   NewPortPool(0, 0),
	}, nil
}

func (m *Manager) Ping(ctx context.Context) error {
	_, err := m.cli.Ping(ctx)
	return err
}

func (m *Manager) SpawnContainer(ctx context.Context, serverID, engine, token string, buildUrl, executableName string, envVars map[string]string) (string, int, error) {
	hostPort, err := m.pool.Allocate(serverID)
	if err != nil {
		log.Printf("[docker] CRASHED port allocation for %s: %v", serverID, err)
		return "", 0, fmt.Errorf("port pool: %w", err)
	}

	imageRef := engineImage(engine)

	if err := m.ensureImage(ctx, imageRef); err != nil {
		m.pool.ReleaseByServerID(serverID)
		return "", 0, fmt.Errorf("image pull: %w", err)
	}

	env := []string{
		fmt.Sprintf("SERVER_TOKEN=%s", token),
		fmt.Sprintf("SERVER_ID=%s", serverID),
		fmt.Sprintf("GAME_PORT=%d", hostPort),
		fmt.Sprintf("RADIX_BUILD_URL=%s", buildUrl),
		fmt.Sprintf("RADIX_EXECUTABLE=%s", executableName),
	}
	for k, v := range envVars {
		env = append(env, fmt.Sprintf("%s=%s", k, v))
	}

	udpPort := nat.Port(fmt.Sprintf("%d/udp", hostPort))
	exposedPorts := nat.PortSet{udpPort: struct{}{}}
	portBindings := nat.PortMap{
		udpPort: []nat.PortBinding{
			{HostIP: "0.0.0.0", HostPort: fmt.Sprintf("%d", hostPort)},
		},
	}

	config := &container.Config{
		Image:        imageRef,
		ExposedPorts: exposedPorts,
		Labels: map[string]string{
			labelServerID: serverID,
		},
		Env: env,
	}

	hostConfig := &container.HostConfig{
		PortBindings: portBindings,
		Resources: container.Resources{
			NanoCPUs: int64(cpuLimit * 1e9),
			Memory:   memoryLimitMB * 1024 * 1024,
		},
		RestartPolicy: container.RestartPolicy{
			Name: container.RestartPolicyUnlessStopped,
		},
	}

	containerName := fmt.Sprintf("radix-%s", serverID)

	created, err := m.cli.ContainerCreate(ctx, config, hostConfig, nil, nil, containerName)
	if err != nil {
		m.pool.ReleaseByServerID(serverID)
		log.Printf("[docker] CRASHED container create for %s: %v", serverID, err)
		return "", 0, fmt.Errorf("container create: %w", err)
	}

	if err := m.cli.ContainerStart(ctx, created.ID, container.StartOptions{}); err != nil {
		m.pool.ReleaseByServerID(serverID)
		cleanupErr := m.cli.ContainerRemove(ctx, created.ID, container.RemoveOptions{Force: true, RemoveVolumes: true})
		if cleanupErr != nil {
			log.Printf("[docker] cleanup failed for %s: %v", created.ID, cleanupErr)
		}
		log.Printf("[docker] CRASHED container start for %s (%s): %v", serverID, created.ID[:12], err)
		return "", 0, fmt.Errorf("container start: %w", err)
	}

	log.Printf("[docker] started container %s (%s) on host port %d for %s", containerName, created.ID[:12], hostPort, serverID)
	return created.ID, hostPort, nil
}

func (m *Manager) StopContainer(ctx context.Context, serverID string) error {
	containers, err := m.cli.ContainerList(ctx, container.ListOptions{
		All:     true,
		Filters: filters.NewArgs(filters.Arg("label", fmt.Sprintf("%s=%s", labelServerID, serverID))),
	})
	if err != nil {
		return fmt.Errorf("list containers: %w", err)
	}

	if len(containers) == 0 {
		return fmt.Errorf("no container found for server %s", serverID)
	}

	cid := containers[0].ID
	log.Printf("[docker] stopping container %s (%s)", cid[:12], serverID)

	stopOpts := container.StopOptions{Signal: "SIGTERM"}
	if err := m.cli.ContainerStop(ctx, cid, stopOpts); err != nil {
		return fmt.Errorf("container stop: %w", err)
	}

	if err := m.cli.ContainerRemove(ctx, cid, container.RemoveOptions{Force: true, RemoveVolumes: true}); err != nil {
		return fmt.Errorf("container remove: %w", err)
	}

	m.pool.ReleaseByServerID(serverID)

	removeHostDataDir(serverID)

	log.Printf("[docker] stopped and removed %s (%s), port released, data purged", cid[:12], serverID)
	return nil
}

func (m *Manager) LookupPort(serverID string) (int, bool) {
	return m.pool.Lookup(serverID)
}

func (m *Manager) PortPoolStats() (minPort, maxPort, allocated int) {
	return m.pool.Stats()
}

func (m *Manager) ListActiveServerIDs(ctx context.Context) ([]string, error) {
	containers, err := m.cli.ContainerList(ctx, container.ListOptions{
		Filters: filters.NewArgs(filters.Arg("label", labelServerID)),
	})
	if err != nil {
		return nil, err
	}

	ids := make([]string, 0, len(containers))
	for _, c := range containers {
		if sid, ok := c.Labels[labelServerID]; ok {
			ids = append(ids, sid)
		}
	}
	return ids, nil
}

func (m *Manager) Cleanup() {
	m.cancel()
	m.wg.Wait()
	if m.cli != nil {
		m.cli.Close()
	}
}

func (m *Manager) Client() *client.Client {
	return m.cli
}

func removeHostDataDir(serverID string) {
	dir := filepath.Join(serverDataRoot, serverID)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return
	}
	if err := os.RemoveAll(dir); err != nil {
		log.Printf("[docker] warning: failed to remove host data dir %s: %v", dir, err)
	} else {
		log.Printf("[docker] purged host data dir %s", dir)
	}
}

func engineImage(engine string) string {
	key := strings.ToLower(strings.TrimSpace(engine))
	if img, ok := engineImages[key]; ok {
		return img
	}
	return "radix/game-server:latest"
}

func (m *Manager) ensureImage(ctx context.Context, ref string) error {
	_, _, err := m.cli.ImageInspectWithRaw(ctx, ref)
	if err == nil {
		return nil
	}

	log.Printf("[docker] pulling image %s", ref)
	reader, err := m.cli.ImagePull(ctx, ref, image.PullOptions{})
	if err != nil {
		return fmt.Errorf("pull %s: %w", ref, err)
	}
	defer reader.Close()

	_, _ = io.Copy(io.Discard, reader)
	log.Printf("[docker] image %s pulled", ref)
	return nil
}
