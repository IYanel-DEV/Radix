package docker

import (
	"bufio"
	"bytes"
	"context"
	"encoding/binary"
	"fmt"
	"io"

	"github.com/docker/docker/api/types/container"
)

const (
	headerSize = 8
	stdout     = 1
	stderr     = 2
)

type LogLine struct {
	ServerID string
	Line     string
	Stream   string
}

type logFrameReader struct {
	src io.ReadCloser
}

func newLogFrameReader(r io.ReadCloser) *logFrameReader {
	return &logFrameReader{src: r}
}

func (r *logFrameReader) Next() (stream byte, data []byte, err error) {
	header := make([]byte, headerSize)
	if _, err = io.ReadFull(r.src, header); err != nil {
		return
	}
	stream = header[0]
	size := binary.BigEndian.Uint32(header[4:8])
	if size == 0 {
		return r.Next()
	}
	data = make([]byte, size)
	_, err = io.ReadFull(r.src, data)
	return
}

func (r *logFrameReader) Close() error {
	return r.src.Close()
}

func (m *Manager) StreamLogs(ctx context.Context, serverID, containerID string, lines chan<- LogLine) error {
	reader, err := m.cli.ContainerLogs(ctx, containerID, container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     true,
		Tail:       "50",
	})
	if err != nil {
		return fmt.Errorf("container logs: %w", err)
	}
	defer reader.Close()

	fr := newLogFrameReader(reader)
	for {
		stream, data, err := fr.Next()
		if err != nil {
			if err == io.EOF || ctx.Err() != nil {
				return nil
			}
			return fmt.Errorf("log frame: %w", err)
		}

		streamName := "stdout"
		if stream == stderr {
			streamName = "stderr"
		}

		scanner := bufio.NewScanner(bytes.NewReader(data))
		scanner.Buffer(make([]byte, 0, 64*1024), 64*1024)
		for scanner.Scan() {
			text := scanner.Text()
			if text == "" {
				continue
			}
			select {
			case lines <- LogLine{ServerID: serverID, Line: text, Stream: streamName}:
			case <-ctx.Done():
				return nil
			}
		}
	}
}
