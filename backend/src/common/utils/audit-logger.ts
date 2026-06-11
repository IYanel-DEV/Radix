import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Injectable()
export class AuditLogger {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(params: {
    userId?: string;
    username: string;
    action: string;
    target?: string;
    targetId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    module: string;
  }): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      userId: params.userId,
      username: params.username,
      action: params.action,
      target: params.target,
      targetId: params.targetId,
      details: params.details || {},
      ipAddress: params.ipAddress,
      module: params.module,
    });

    return this.auditLogRepository.save(auditLog);
  }
}
