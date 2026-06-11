import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Server } from '../../database/entities/server.entity';
import { ServerMetric } from '../../database/entities/server-metric.entity';
import * as client from 'prom-client';
import { IncomingMessage, ServerResponse, createServer } from 'http';
import { Response } from 'express';

const collectDefaultMetrics = client.collectDefaultMetrics;

let register: client.Registry;
let metricsInitialized = false;

export function initMetrics() {
  if (metricsInitialized) return;

  register = new client.Registry();
  collectDefaultMetrics({ register });

  new client.Gauge({
    name: 'server_manager_server_uptime_seconds',
    help: 'Server uptime in seconds',
    labelNames: ['server_id', 'server_name'],
    registers: [register],
  });

  new client.Gauge({
    name: 'server_manager_player_count',
    help: 'Current player count per server',
    labelNames: ['server_id', 'server_name'],
    registers: [register],
  });

  new client.Gauge({
    name: 'server_manager_cpu_usage_percent',
    help: 'CPU usage per server',
    labelNames: ['server_id', 'server_name'],
    registers: [register],
  });

  new client.Gauge({
    name: 'server_manager_ram_usage_mb',
    help: 'RAM usage per server in MB',
    labelNames: ['server_id', 'server_name'],
    registers: [register],
  });

  new client.Gauge({
    name: 'server_manager_server_status',
    help: 'Server status (0=stopped, 1=running, 2=crashed)',
    labelNames: ['server_id', 'server_name'],
    registers: [register],
  });

  new client.Histogram({
    name: 'server_manager_request_duration_seconds',
    help: 'Request duration in seconds',
    labelNames: ['method', 'path', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register],
  });

  metricsInitialized = true;
}

export async function metricsHandler(req: IncomingMessage, res: ServerResponse) {
  if (req.url === '/metrics') {
    (res as any).setHeader('Content-Type', register.contentType);
    (res as any).end(await register.metrics());
  } else {
    (res as any).statusCode = 404;
    (res as any).end('Not found');
  }
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger('MetricsService');

  constructor(
    @InjectRepository(Server)
    private serverRepository: Repository<Server>,
    @InjectRepository(ServerMetric)
    private metricRepository: Repository<ServerMetric>,
  ) {
    if (!metricsInitialized) {
      initMetrics();
    }
  }

  async updateServerMetrics() {
    const servers = await this.serverRepository.find();

    for (const server of servers) {
      const statusValue = server.status === 'running' ? 1 : server.status === 'crashed' ? 2 : 0;
      const labels = { server_id: server.id, server_name: server.name };

      (register.getSingleMetric('server_manager_server_uptime_seconds') as client.Gauge<string>)?.set(labels, server.uptime);
      (register.getSingleMetric('server_manager_player_count') as client.Gauge<string>)?.set(labels, server.playerCount);
      (register.getSingleMetric('server_manager_cpu_usage_percent') as client.Gauge<string>)?.set(labels, server.cpuUsage);
      (register.getSingleMetric('server_manager_ram_usage_mb') as client.Gauge<string>)?.set(labels, server.ramUsage);
      (register.getSingleMetric('server_manager_server_status') as client.Gauge<string>)?.set(labels, statusValue);
    }
  }

  async getDashboard() {
    const totalServers = await this.serverRepository.count();
    const runningServers = await this.serverRepository.count({ where: { status: 'running' as any } });
    const totalCpu = await this.serverRepository
      .createQueryBuilder('server')
      .select('SUM(server.cpuUsage)', 'total')
      .getRawOne();
    const totalRam = await this.serverRepository
      .createQueryBuilder('server')
      .select('SUM(server.ramUsage)', 'total')
      .getRawOne();

    const avgMetrics = await this.metricRepository
      .createQueryBuilder('metric')
      .select('AVG(metric.cpuUsage)', 'avgCpu')
      .addSelect('AVG(metric.ramUsage)', 'avgRam')
      .addSelect('AVG(metric.playerCount)', 'avgPlayers')
      .addSelect('AVG(metric.tickRate)', 'avgTickRate')
      .where('metric.timestamp > NOW() - INTERVAL \'1 hour\'')
      .getRawOne();

    return {
      servers: { total: totalServers, running: runningServers },
      resources: {
        totalCpu: parseFloat(totalCpu?.total || '0'),
        totalRam: parseFloat(totalRam?.total || '0'),
        avgCpu: parseFloat(avgMetrics?.avgCpu || '0'),
        avgRam: parseFloat(avgMetrics?.avgRam || '0'),
        avgPlayers: parseInt(avgMetrics?.avgPlayers || '0', 10),
        avgTickRate: parseFloat(avgMetrics?.avgTickRate || '0'),
      },
    };
  }

  async getServerMetrics(id: string, hours = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    return this.metricRepository.find({
      where: {
        serverId: id,
        timestamp: MoreThan(since),
      },
      order: { timestamp: 'ASC' },
    });
  }
}


