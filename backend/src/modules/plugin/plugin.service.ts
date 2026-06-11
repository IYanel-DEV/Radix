import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from '../../database/entities/server.entity';
import { ServerMetric } from '../../database/entities/server-metric.entity';
import { ServerLog } from '../../database/entities/server-log.entity';
import { Player } from '../../database/entities/player.entity';

@Injectable()
export class PluginService {
  private readonly logger = new Logger('PluginService');

  constructor(
    @InjectRepository(Server)
    private serverRepository: Repository<Server>,
    @InjectRepository(ServerMetric)
    private metricRepository: Repository<ServerMetric>,
    @InjectRepository(ServerLog)
    private logRepository: Repository<ServerLog>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
  ) {}

  async submitMetrics(serverId: string, data: any) {
    const metric = this.metricRepository.create({
      serverId,
      cpuUsage: data.cpuUsage || 0,
      ramUsage: data.ramUsage || 0,
      playerCount: data.playerCount || 0,
      tickRate: data.tickRate || 0,
      networkIn: data.networkIn || 0,
      networkOut: data.networkOut || 0,
    });
    await this.metricRepository.save(metric);
    await this.serverRepository.update(serverId, {
      cpuUsage: data.cpuUsage || 0,
      ramUsage: data.ramUsage || 0,
      playerCount: data.playerCount || 0,
    });
    return { status: 'ok' };
  }

  async submitPlayers(serverId: string, data: any) {
    if (data.players && Array.isArray(data.players)) {
      await this.playerRepository.delete({ serverId });
      for (const playerData of data.players) {
        const player = this.playerRepository.create({
          serverId,
          playerId: playerData.steamId || playerData.id || playerData.playerId || '',
          username: playerData.username || 'Unknown',
          ipAddress: playerData.ip || playerData.ipAddress || '',
        } as any);
        await this.playerRepository.save(player);
      }
      await this.serverRepository.update(serverId, {
        playerCount: data.players.length,
      });
    }
    return { status: 'ok' };
  }

  async submitLog(serverId: string, data: any) {
    const log = this.logRepository.create({
      serverId,
      level: data.level || 'info',
      message: data.message || '',
    });
    await this.logRepository.save(log);
    return { status: 'ok' };
  }

  async getServerStatus(serverId: string) {
    const server = await this.serverRepository.findOne({ where: { id: serverId } });
    if (!server) return { status: 'unknown' };
    return {
      id: server.id,
      name: server.name,
      status: server.status,
      playerCount: server.playerCount,
      cpuUsage: server.cpuUsage,
      ramUsage: server.ramUsage,
      uptime: server.uptime,
    };
  }
}
