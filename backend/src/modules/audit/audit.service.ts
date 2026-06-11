import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async findAll(page = 1, limit = 50, filters?: { action?: string; module?: string }) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(200, Math.max(1, Number(limit) || 50));
    const query = this.auditLogRepository.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .skip((p - 1) * l)
      .take(l)
      .orderBy('log.createdAt', 'DESC');

    if (filters?.action) {
      query.andWhere('log.action = :action', { action: filters.action });
    }

    if (filters?.module) {
      query.andWhere('log.module = :module', { module: filters.module });
    }

    const [logs, total] = await query.getManyAndCount();

    return {
      data: logs,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }

  async findById(id: string) {
    const log = await this.auditLogRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!log) {
      throw new NotFoundException('Audit log not found');
    }

    return log;
  }

  async findByUser(userId: string, page = 1, limit = 50) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(200, Math.max(1, Number(limit) || 50));
    const query = this.auditLogRepository.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.userId = :userId', { userId })
      .skip((p - 1) * l)
      .take(l)
      .orderBy('log.createdAt', 'DESC');

    const [logs, total] = await query.getManyAndCount();

    return {
      data: logs,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }

  async findByModule(module: string, page = 1, limit = 50) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(200, Math.max(1, Number(limit) || 50));
    const query = this.auditLogRepository.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.module = :module', { module })
      .skip((p - 1) * l)
      .take(l)
      .orderBy('log.createdAt', 'DESC');

    const [logs, total] = await query.getManyAndCount();

    return {
      data: logs,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }
}
