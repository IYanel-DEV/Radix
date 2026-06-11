import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ServerMetric } from '../../database/entities/server-metric.entity';
import { Server } from '../../database/entities/server.entity';

@Injectable()
export class ServerMetricsService {
  private readonly logger = new Logger('ServerMetricsService');

  constructor(
    @InjectRepository(ServerMetric)
    private metricRepository: Repository<ServerMetric>,
    @InjectRepository(Server)
    private serverRepository: Repository<Server>,
  ) {}

  async recordMetric(serverId: string, data: {
    cpuUsage: number;
    ramUsage: number;
    playerCount: number;
    tickRate: number;
    networkIn?: number;
    networkOut?: number;
  }) {
    const metric = this.metricRepository.create({
      serverId,
      cpuUsage: data.cpuUsage,
      ramUsage: data.ramUsage,
      playerCount: data.playerCount,
      tickRate: data.tickRate,
      networkIn: data.networkIn || 0,
      networkOut: data.networkOut || 0,
    });

    await this.metricRepository.save(metric);

    await this.serverRepository.update(serverId, {
      cpuUsage: data.cpuUsage,
      ramUsage: data.ramUsage,
      playerCount: data.playerCount,
      tickRate: data.tickRate,
    });
  }

  async getMetrics(serverId: string, hours = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    return this.metricRepository.find({
      where: {
        serverId,
        timestamp: MoreThan(since),
      },
      order: { timestamp: 'ASC' },
    });
  }

  async aggregateMetrics(serverId: string, hours = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const metrics = await this.metricRepository.find({
      where: { serverId, timestamp: MoreThan(since) },
      order: { timestamp: 'ASC' },
    });

    if (metrics.length === 0) {
      return null;
    }

    const avgCpu = metrics.reduce((s, m) => s + m.cpuUsage, 0) / metrics.length;
    const avgRam = metrics.reduce((s, m) => s + m.ramUsage, 0) / metrics.length;
    const maxPlayers = Math.max(...metrics.map((m) => m.playerCount));
    const avgTickRate = metrics.reduce((s, m) => s + m.tickRate, 0) / metrics.length;

    return {
      avgCpu: parseFloat(avgCpu.toFixed(2)),
      avgRam: parseFloat(avgRam.toFixed(2)),
      maxPlayers,
      avgTickRate: parseFloat(avgTickRate.toFixed(2)),
      totalSamples: metrics.length,
      timeRange: { from: since.toISOString(), to: new Date().toISOString() },
    };
  }

  async cleanupOldMetrics(retentionDays = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await this.metricRepository.delete({
      timestamp: LessThan(cutoff),
    });

    this.logger.log(`Cleaned up ${result.affected} old metric records`);
  }
}
