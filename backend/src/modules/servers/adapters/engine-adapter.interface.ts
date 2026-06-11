export enum EngineType {
  GODOT = 'godot',
  UNREAL = 'unreal',
  UNITY = 'unity',
}

export interface ProcessStats {
  pid: number;
  cpuUsage: number;
  ramUsageMb: number;
  uptimeSeconds: number;
  status: 'running' | 'stopped' | 'crashed';
  startTime: string;
}

export interface ServerMetrics {
  cpuUsage: number;
  ramUsageMb: number;
  playerCount: number;
  tickRate?: number;
  fps?: number;
  networkInBps?: number;
  networkOutBps?: number;
  uptimeSeconds: number;
}

export interface EngineAdapter {
  readonly engineType: EngineType;

  startServer(executablePath: string, serverDirectory: string, args: string[]): Promise<ProcessStats>;
  stopServer(timeout?: number): Promise<void>;
  restartServer(timeout?: number): Promise<void>;
  killServer(): Promise<void>;
  getProcessStats(): ProcessStats;
  sendCommand(command: string): void;
  collectMetrics(): Promise<ServerMetrics>;
  isRunning(): boolean;
  getPlayers(): Promise<string[]>;
  getLogs(): Promise<string[]>;

  on(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
}
