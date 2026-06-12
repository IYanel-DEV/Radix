package websocket

import "encoding/json"

type Message struct {
	Action  string      `json:"action"`
	Payload interface{} `json:"payload,omitempty"`
}

type HeartbeatPayload struct {
	NodeID        string  `json:"nodeId"`
	CPUPercent    float64 `json:"cpuPercent"`
	MemoryTotalMB uint64  `json:"memoryTotalMB"`
	MemoryUsedMB  uint64  `json:"memoryUsedMB"`
	MemoryFreeMB  uint64  `json:"memoryFreeMB"`
	ContainerIDs  []string `json:"containerIds,omitempty"`
}

type SpawnPayload struct {
	ServerID        string            `json:"serverId"`
	Engine          string            `json:"engine"`
	Port            int               `json:"port"`
	Token           string            `json:"token"`
	BuildURL        string            `json:"buildUrl"`
	ExecutableName  string            `json:"executableName"`
	EnvVariables    map[string]string `json:"envVariables"`
}

type StopPayload struct {
	ServerID string `json:"serverId"`
}

type StatusChangePayload struct {
	ServerID    string `json:"serverId"`
	Status      string `json:"status"`
	ContainerID string `json:"containerId,omitempty"`
	HostPort    int    `json:"hostPort,omitempty"`
	Error       string `json:"error,omitempty"`
}

type LogPayload struct {
	ServerID string `json:"serverId"`
	Line     string `json:"line"`
	Stream   string `json:"stream"`
}

func (m Message) Marshal() ([]byte, error) {
	return json.Marshal(m)
}

func parseMessage(raw []byte) (Message, error) {
	var m Message
	if err := json.Unmarshal(raw, &m); err != nil {
		return m, err
	}
	return m, nil
}

func marshalJSON(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}
