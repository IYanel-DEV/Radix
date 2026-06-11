import { EventEmitter } from 'events';
import { ChildProcess, spawn, execSync } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '@nestjs/common';
import { ServerStatus } from '../../database/entities/server.entity';

export interface ProcessInfo {
  pid: number;
  cpuUsage: number;
  ramUsage: number;
  uptime: number;
  status: ServerStatus;
}

export class ServerProcessManager extends EventEmitter {
  private readonly logger = new Logger('ServerProcessManager');
  private process: ChildProcess | null = null;
  private startTime: number = 0;
  private monitorInterval: ReturnType<typeof setInterval> | null = null;
  private cpuUsage = 0;
  private ramUsage = 0;

  constructor(
    private readonly serverId: string,
    private readonly executablePath: string,
    private readonly serverDirectory: string,
    private readonly startupCommand?: string,
  ) {
    super();
  }

  async start(args?: string[]): Promise<void> {
    if (this.process) {
      throw new Error('Server process is already running');
    }

    const execPath = path.resolve(this.executablePath);
    const execDir = path.resolve(this.serverDirectory);

    this.logger.log(`Starting server process: ${execPath} in ${execDir}`);

    const spawnArgs = args || [];

    if (this.startupCommand) {
      const customArgs = this.startupCommand.split(' ').filter((a) => a.length > 0);
      spawnArgs.push(...customArgs);
    }

    this.process = spawn(execPath, spawnArgs, {
      cwd: execDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
    });

    this.startTime = Date.now();
    this.emit('status', ServerStatus.STARTING);

    if (this.process.pid) {
      try {
        os.setPriority(this.process.pid, 19);
      } catch { /* platform may not support setPriority */ }
    }

    this.process.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter((l) => l.length > 0);
      for (const line of lines) {
        this.emit('log', { serverId: this.serverId, level: 'info', message: line });
      }
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter((l) => l.length > 0);
      for (const line of lines) {
        this.emit('log', { serverId: this.serverId, level: 'error', message: line });
      }
    });

    this.process.on('exit', (code, signal) => {
      this.logger.warn(`Server process exited with code ${code}, signal ${signal}`);
      this.cleanup();
      this.emit('status', code === 0 ? ServerStatus.STOPPED : ServerStatus.CRASHED);
      this.emit('exit', { code, signal });
    });

    this.process.on('error', (err) => {
      this.logger.error(`Server process error: ${err.message}`);
      this.cleanup();
      this.emit('status', ServerStatus.CRASHED);
      this.emit('error', err);
    });

    setTimeout(() => {
      if (this.process && !this.process.killed) {
        this.emit('status', ServerStatus.RUNNING);
        this.startMonitoring();
      }
    }, 5000);
  }

  async stop(timeout = 30000): Promise<void> {
    if (!this.process) return;

    this.emit('status', ServerStatus.STOPPING);
    this.stopMonitoring();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
          this.logger.warn('Force killed server process');
        }
        resolve();
      }, timeout);

      this.process!.on('exit', () => {
        clearTimeout(timer);
        this.cleanup();
        resolve();
      });

      try {
        if (!this.process) return;
        const isWindows = process.platform === 'win32';
        if (isWindows) {
          execSync(`taskkill /PID ${this.process.pid} /T /F`, { stdio: 'ignore' });
        } else {
          this.process.kill('SIGTERM');
        }
      } catch {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }

      setTimeout(() => {
        clearTimeout(timer);
        resolve();
      }, 5000);
    });
  }

  async restart(timeout = 30000): Promise<void> {
    await this.stop(timeout);
    await this.start();
  }

  kill(): void {
    if (!this.process) return;

    this.stopMonitoring();
    try {
      const isWindows = process.platform === 'win32';
      if (isWindows) {
        execSync(`taskkill /PID ${this.process.pid} /T /F`, { stdio: 'ignore' });
      } else {
        this.process.kill('SIGKILL');
      }
    } catch {
      // Process may already be dead
    }
    this.cleanup();
    this.emit('status', ServerStatus.STOPPED);
  }

  sendCommand(command: string): void {
    if (!this.process || !this.process.stdin) {
      throw new Error('Server process is not running');
    }
    this.process.stdin.write(`${command}\n`);
    this.logger.log(`Sent command to server: ${command}`);
  }

  getProcessInfo(): ProcessInfo {
    return {
      pid: this.process?.pid || 0,
      cpuUsage: this.cpuUsage,
      ramUsage: this.ramUsage,
      uptime: this.startTime > 0 ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      status: this.process ? ServerStatus.RUNNING : ServerStatus.STOPPED,
    };
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  private startMonitoring() {
    this.monitorInterval = setInterval(() => {
      if (!this.process || this.process.killed) {
        this.stopMonitoring();
        return;
      }

      try {
        const pid = this.process.pid;
        if (process.platform === 'win32') {
          const result = execSync(
            `powershell "Get-Process -Id ${pid} | Select-Object CPU, WorkingSet64 | ConvertTo-Json"`,
            { encoding: 'utf8', timeout: 5000 },
          );
          try {
            const data = JSON.parse(result);
            this.cpuUsage = parseFloat((data.CPU || 0).toFixed(2));
            this.ramUsage = parseFloat(((data.WorkingSet64 || 0) / 1024 / 1024).toFixed(2));
          } catch {
            // Parse failed, keep previous values
          }
        } else {
          try {
            const result = execSync(`ps -p ${pid} -o %cpu,%mem --no-headers 2>/dev/null`, {
              encoding: 'utf8',
              timeout: 3000,
            });
            const parts = result.trim().split(/\s+/);
            if (parts.length >= 2) {
              this.cpuUsage = parseFloat(parts[0]) || 0;
              this.ramUsage = parseFloat(parts[1]) || 0;
            }
          } catch {
            // ps failed
          }
        }
      } catch {
        // Monitoring failed
      }

      this.emit('metrics', {
        serverId: this.serverId,
        cpuUsage: this.cpuUsage,
        ramUsage: this.ramUsage,
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        timestamp: new Date(),
      });
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
  }
}
