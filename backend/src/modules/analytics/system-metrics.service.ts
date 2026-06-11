import { Injectable, Logger } from '@nestjs/common';
import { execSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';

export interface SystemMetrics {
  cpu: {
    usagePercent: number;
    cores: number;
    model: string;
    loadAverage: number[];
  };
  memory: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
    usagePercent: number;
  };
  disk: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
    usagePercent: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    interfaces: { name: string; rx: number; tx: number }[];
  };
  os: {
    platform: string;
    hostname: string;
    uptimeHours: number;
    release: string;
  };
  processes: {
    total: number;
    running: number;
  };
}

@Injectable()
export class SystemMetricsService {
  private readonly logger = new Logger('SystemMetricsService');
  private previousRx: Record<string, number> = {};
  private previousTx: Record<string, number> = {};
  private lastNetworkSample = Date.now();

  collectSystemMetrics(): SystemMetrics {
    return {
      cpu: this.getCpuMetrics(),
      memory: this.getMemoryMetrics(),
      disk: this.getDiskMetrics(),
      network: this.getNetworkMetrics(),
      os: this.getOsMetrics(),
      processes: this.getProcessMetrics(),
    };
  }

  private getCpuMetrics() {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce((acc, cpu) => acc + Object.values(cpu.times).reduce((a, b) => a + b, 0), 0);
    const usagePercent = totalTick > 0 ? parseFloat(((1 - totalIdle / totalTick) * 100).toFixed(2)) : 0;
    return {
      usagePercent,
      cores: cpus.length,
      model: cpus[0]?.model || 'unknown',
      loadAverage: os.loadavg().map((v) => parseFloat(v.toFixed(2))),
    };
  }

  private getMemoryMetrics() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    return {
      totalGb: parseFloat((total / 1073741824).toFixed(2)),
      usedGb: parseFloat((used / 1073741824).toFixed(2)),
      freeGb: parseFloat((free / 1073741824).toFixed(2)),
      usagePercent: parseFloat(((used / total) * 100).toFixed(2)),
    };
  }

  private getDiskMetrics() {
    try {
      if (process.platform === 'win32') {
        const result = execSync(
          `powershell "Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID, Size, FreeSpace | ConvertTo-Json"`,
          { encoding: 'utf8', timeout: 5000 },
        );
        const disks = JSON.parse(result);
        const arr = Array.isArray(disks) ? disks : [disks];
        let total = 0;
        let free = 0;
        for (const d of arr) {
          if (d.Size) { total += parseInt(d.Size, 10); }
          if (d.FreeSpace) { free += parseInt(d.FreeSpace, 10); }
        }
        const used = total - free;
        return {
          totalGb: parseFloat((total / 1073741824).toFixed(2)),
          usedGb: parseFloat((used / 1073741824).toFixed(2)),
          freeGb: parseFloat((free / 1073741824).toFixed(2)),
          usagePercent: total > 0 ? parseFloat(((used / total) * 100).toFixed(2)) : 0,
        };
      }
    } catch { /* ignore */ }
    return { totalGb: 0, usedGb: 0, freeGb: 0, usagePercent: 0 };
  }

  private getNetworkMetrics() {
    const now = Date.now();
    const deltaSec = Math.max((now - this.lastNetworkSample) / 1000, 1);
    const ifaces = os.networkInterfaces();
    const interfaces: { name: string; rx: number; tx: number }[] = [];

    let totalRx = 0;
    let totalTx = 0;

    for (const [name, addrs] of Object.entries(ifaces)) {
      if (!addrs || name.startsWith('lo') || name.startsWith('Loopback')) continue;
      try {
        const stats = this.getNetworkStats(name);
        if (stats) {
          const prevRx = this.previousRx[name] || stats.rx;
          const prevTx = this.previousTx[name] || stats.tx;
          const rxBps = Math.max(0, (stats.rx - prevRx) / deltaSec);
          const txBps = Math.max(0, (stats.tx - prevTx) / deltaSec);
          interfaces.push({ name, rx: Math.round(rxBps), tx: Math.round(txBps) });
          totalRx += rxBps;
          totalTx += txBps;
          this.previousRx[name] = stats.rx;
          this.previousTx[name] = stats.tx;
        }
      } catch { /* ignore */ }
    }

    this.lastNetworkSample = now;
    return { bytesReceived: Math.round(totalRx), bytesSent: Math.round(totalTx), interfaces };
  }

  private getNetworkStats(iface: string): { rx: number; tx: number } | null {
    try {
      if (process.platform === 'win32') {
        const result = execSync(
          `powershell "Get-NetAdapterStatistics -Name '*${iface.replace(/'/g, "''")}*' | Select-Object ReceivedBytes, SentBytes | ConvertTo-Json"`,
          { encoding: 'utf8', timeout: 3000 },
        );
        const data = JSON.parse(result);
        if (data) {
          return { rx: parseInt(data.ReceivedBytes || '0', 10), tx: parseInt(data.SentBytes || '0', 10) };
        }
      }
    } catch { /* ignore */ }
    return null;
  }

  private getOsMetrics() {
    return {
      platform: `${os.type()} ${os.release()}`,
      hostname: os.hostname(),
      uptimeHours: parseFloat((os.uptime() / 3600).toFixed(2)),
      release: os.release(),
    };
  }

  private getProcessMetrics() {
    try {
      if (process.platform === 'win32') {
        const result = execSync(
          `powershell "Get-Process | Measure-Object | Select-Object Count | ConvertTo-Json"`,
          { encoding: 'utf8', timeout: 5000 },
        );
        const data = JSON.parse(result);
        return { total: parseInt(data.Count || '0', 10), running: parseInt(data.Count || '0', 10) };
      }
    } catch { /* ignore */ }
    return { total: 0, running: 0 };
  }
}
