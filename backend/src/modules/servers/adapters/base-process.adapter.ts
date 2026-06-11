import { EventEmitter } from 'events';
import { ChildProcess, spawn, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { EngineAdapter, EngineType, ProcessStats, ServerMetrics } from './engine-adapter.interface';

export abstract class BaseProcessAdapter extends EventEmitter implements EngineAdapter {
  abstract readonly engineType: EngineType;

  protected process: ChildProcess | null = null;
  protected startTime = 0;
  protected cpuUsage = 0;
  protected ramUsageMb = 0;
  protected playerCount = 0;
  protected monitorInterval: ReturnType<typeof setInterval> | null = null;

  abstract buildStartArgs(args: string[]): string[];
  protected getStartupTimeout(): number { return 5000; }

  protected onStdoutLine(_line: string): void {}
  protected onStderrLine(_line: string): void {}

  protected getEngineMetrics(): Partial<ServerMetrics> {
    return {};
  }

  startServer(executablePath: string, serverDirectory: string, args: string[]): Promise<ProcessStats> {
    return new Promise((resolve, reject) => {
      const execPath = path.resolve(executablePath);
      const execDir = path.resolve(serverDirectory);

      if (!fs.existsSync(execPath)) {
        return reject(new Error(`Executable not found: ${execPath}`));
      }
      if (!fs.existsSync(execDir)) {
        return reject(new Error(`Server directory not found: ${execDir}`));
      }

      const procArgs = this.buildStartArgs(args);
      this.process = spawn(execPath, procArgs, {
        cwd: execDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      this.startTime = Date.now();
      this.emit('status', 'starting');

      if (this.process.pid) {
        try {
          os.setPriority(this.process.pid, 19);
        } catch { /* platform may not support setPriority */ }
      }

      this.process.stdout?.on('data', (data: Buffer) => {
        for (const line of data.toString().split('\n').filter(Boolean)) {
          this.emit('log', { level: 'info', message: line });
          this.onStdoutLine(line);
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        for (const line of data.toString().split('\n').filter(Boolean)) {
          this.emit('log', { level: 'error', message: line });
          this.onStderrLine(line);
        }
      });

      this.process.on('error', (err) => {
        this.cleanup();
        this.emit('status', 'crashed');
        reject(err);
      });

      this.process.on('exit', (code) => {
        this.cleanup();
        this.emit('status', code === 0 ? 'stopped' : 'crashed');
        this.emit('exit', { code });
      });

      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.startMonitoring();
          this.emit('status', 'running');
          resolve(this.getProcessStats());
        }
      }, this.getStartupTimeout());
    });
  }

  stopServer(timeout = 30000): Promise<void> {
    return this.gracefulStop(timeout);
  }

  restartServer(_timeout = 30000): Promise<void> {
    return Promise.reject(new Error('Restart requires startServer() call with executable path'));
  }

  killServer(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.process) { resolve(); return; }
      this.stopMonitoring();
      try {
        if (process.platform === 'win32' && this.process.pid) {
          execSync(`taskkill /PID ${this.process.pid} /T /F`, { stdio: 'ignore' });
        } else if (this.process.pid) {
          process.kill(this.process.pid, 'SIGKILL');
        }
      } catch { /* ignore */ }
      this.cleanup();
      this.emit('status', 'stopped');
      resolve();
    });
  }

  getProcessStats(): ProcessStats {
    return {
      pid: this.process?.pid || 0,
      cpuUsage: this.cpuUsage,
      ramUsageMb: this.ramUsageMb,
      uptimeSeconds: this.startTime > 0 ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      status: this.process && !this.process.killed ? 'running' : 'stopped',
      startTime: this.startTime > 0 ? new Date(this.startTime).toISOString() : '',
    };
  }

  sendCommand(command: string): void {
    if (!this.process?.stdin) {
      throw new Error('Server process is not running');
    }
    this.process.stdin.write(`${command}\n`);
    this.emit('command', command);
  }

  async collectMetrics(): Promise<ServerMetrics> {
    const stats = this.getProcessStats();
    if (stats.status !== 'running') {
      return { cpuUsage: 0, ramUsageMb: 0, playerCount: 0, uptimeSeconds: 0 };
    }
    return {
      cpuUsage: this.cpuUsage,
      ramUsageMb: this.ramUsageMb,
      playerCount: this.playerCount,
      uptimeSeconds: stats.uptimeSeconds,
      ...this.getEngineMetrics(),
    };
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  async getPlayers(): Promise<string[]> {
    return [];
  }

  async getLogs(): Promise<string[]> {
    return [];
  }

  private gracefulStop(timeout: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.process) { resolve(); return; }
      this.emit('status', 'stopping');
      this.stopMonitoring();

      const timer = setTimeout(() => {
        this.process?.kill('SIGKILL');
        this.cleanup();
        resolve();
      }, timeout);

      this.process.on('exit', () => {
        clearTimeout(timer);
        this.cleanup();
        resolve();
      });

      try {
        if (process.platform === 'win32' && this.process.pid) {
          execSync(`taskkill /PID ${this.process.pid} /T /F`, { stdio: 'ignore' });
        } else {
          this.process?.kill('SIGTERM');
        }
      } catch {
        this.process?.kill('SIGKILL');
      }
    });
  }

  private startMonitoring() {
    this.monitorInterval = setInterval(() => {
      if (!this.process?.pid) return;
      try {
        if (process.platform === 'win32') {
          const result = execSync(
            `powershell "Get-Process -Id ${this.process.pid} | Select-Object CPU, WorkingSet64 | ConvertTo-Json"`,
            { encoding: 'utf8', timeout: 5000 },
          );
          const data = JSON.parse(result);
          if (data && !data.length) {
            this.cpuUsage = parseFloat((data.CPU || 0).toFixed(2));
            this.ramUsageMb = parseFloat(((data.WorkingSet64 || 0) / 1024 / 1024).toFixed(2));
          }
        }
      } catch { /* ignore */ }
    }, 5000);
  }

  private stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  private cleanup() {
    this.stopMonitoring();
    this.process = null;
    this.startTime = 0;
    this.cpuUsage = 0;
    this.ramUsageMb = 0;
    this.playerCount = 0;
  }
}
