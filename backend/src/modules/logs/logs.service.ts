import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServerLog, LogLevel } from '../../database/entities/server-log.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LogsService {
  private readonly logger = new Logger('LogsService');

  constructor(
    @InjectRepository(ServerLog)
    private logRepository: Repository<ServerLog>,
  ) {}

  async findAll(serverId?: string, page = 1, limit = 100, level?: string, search?: string) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(500, Math.max(1, Number(limit) || 100));
    const query = this.logRepository.createQueryBuilder('log')
      .leftJoinAndSelect('log.server', 'server')
      .skip((p - 1) * l)
      .take(l)
      .orderBy('log.timestamp', 'DESC');

    if (serverId) {
      query.andWhere('log.serverId = :serverId', { serverId });
    }

    if (level) {
      query.andWhere('log.level = :level', { level });
    }

    if (search) {
      query.andWhere('log.message ILIKE :search', { search: `%${search}%` });
    }

    const [logs, total] = await query.getManyAndCount();

    return {
      data: logs,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }

  async findById(id: string) {
    const log = await this.logRepository.findOne({
      where: { id },
      relations: ['server'],
    });

    if (!log) {
      throw new NotFoundException('Log entry not found');
    }

    return log;
  }

  async deleteAll(serverId?: string) {
    if (serverId) {
      const result = await this.logRepository.delete({ serverId });
      return { message: `Deleted ${result.affected} log entries for server ${serverId}` };
    }

    const result = await this.logRepository.delete({});
    return { message: `Deleted ${result.affected} log entries` };
  }

  async downloadLogs(serverId?: string, level?: string): Promise<string> {
    const query = this.logRepository.createQueryBuilder('log')
      .orderBy('log.timestamp', 'ASC');

    if (serverId) {
      query.andWhere('log.serverId = :serverId', { serverId });
    }

    if (level) {
      query.andWhere('log.level = :level', { level });
    }

    const logs = await query.getMany();

    const exportDir = path.join(process.env.UPLOAD_DIR || './uploads', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const fileName = `logs_export_${Date.now()}.csv`;
    const filePath = path.join(exportDir, fileName);

    const header = 'Timestamp,Level,ServerID,Message\n';
    const rows = logs.map((l) =>
      `"${l.timestamp.toISOString()}","${l.level}","${l.serverId}","${l.message.replace(/"/g, '""')}"`,
    ).join('\n');

    fs.writeFileSync(filePath, header + rows, 'utf8');

    return filePath;
  }

  async createLogEntry(serverId: string, level: LogLevel, message: string): Promise<ServerLog> {
    const log = this.logRepository.create({
      serverId,
      level,
      message,
    });

    return this.logRepository.save(log);
  }

  async getRecentLogs(serverId: string, limit = 50): Promise<ServerLog[]> {
    return this.logRepository.find({
      where: { serverId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }
}
