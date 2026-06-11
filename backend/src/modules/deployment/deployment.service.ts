import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from '../../database/entities/server.entity';
import { ServerBuild } from '../../database/entities/server-build.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import * as fs from 'fs';
import * as path from 'path';

export interface DeploymentRecord {
  id: string;
  serverId: string;
  serverName: string;
  buildId: string;
  buildVersion: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

@Injectable()
export class DeploymentService {
  private readonly logger = new Logger('DeploymentService');
  private deploymentHistory: DeploymentRecord[] = [];

  constructor(
    @InjectRepository(Server)
    private serverRepository: Repository<Server>,
    @InjectRepository(ServerBuild)
    private buildRepository: Repository<ServerBuild>,
    private auditLogger: AuditLogger,
  ) {}

  async deploy(serverId: string, buildId: string, actorId?: string, actorName?: string) {
    const server = await this.serverRepository.findOne({ where: { id: serverId } });
    if (!server) {
      throw new NotFoundException('Server not found');
    }

    const build = await this.buildRepository.findOne({ where: { id: buildId } });
    if (!build) {
      throw new NotFoundException('Build not found');
    }

    if (!fs.existsSync(build.filePath)) {
      throw new BadRequestException('Build file not found on disk');
    }

    const record: DeploymentRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      serverId,
      serverName: server.name,
      buildId,
      buildVersion: build.version,
      status: 'in_progress',
      startedAt: new Date(),
    };

    this.deploymentHistory.push(record);

    try {
      const wasRunning = server.status === 'running';

      const buildDir = path.dirname(server.executablePath);
      const sourcePath = build.filePath;
      const destPath = path.join(buildDir, build.fileName);

      this.logger.log(`Deploying build ${build.version} to server ${server.name}`);

      if (fs.lstatSync(sourcePath).isDirectory()) {
        this.copyDirectorySync(sourcePath, buildDir);
      } else {
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
        fs.copyFileSync(sourcePath, destPath);
      }

      server.buildId = buildId;
      server.buildVersion = build.version;
      await this.serverRepository.save(server);

      record.status = 'completed';
      record.completedAt = new Date();

      await this.auditLogger.log({
        userId: actorId,
        username: actorName || 'system',
        action: 'DEPLOYMENT_EXECUTED',
        target: 'Server',
        targetId: serverId,
        module: 'Deployment',
        details: { buildId, version: build.version, buildFile: build.fileName },
      });

      this.logger.log(`Deployment completed for server ${server.name} (build ${build.version})`);

      return {
        id: record.id,
        serverId,
        serverName: server.name,
        buildId,
        buildVersion: build.version,
        status: 'completed',
        message: 'Deployment completed successfully',
      };
    } catch (err) {
      record.status = 'failed';
      record.completedAt = new Date();
      record.error = err.message;

      this.logger.error(`Deployment failed for server ${server.name}: ${err.message}`);

      throw new BadRequestException(`Deployment failed: ${err.message}`);
    }
  }

  async rollback(serverId: string, targetBuildId: string, actorId?: string, actorName?: string) {
    const server = await this.serverRepository.findOne({ where: { id: serverId } });
    if (!server) {
      throw new NotFoundException('Server not found');
    }

    const build = await this.buildRepository.findOne({ where: { id: targetBuildId } });
    if (!build) {
      throw new NotFoundException('Build not found');
    }

    if (!fs.existsSync(build.filePath)) {
      throw new BadRequestException('Rollback build file not found on disk');
    }

    const buildDir = path.dirname(server.executablePath);
    const sourcePath = build.filePath;

    if (fs.lstatSync(sourcePath).isDirectory()) {
      this.copyDirectorySync(sourcePath, buildDir);
    } else {
      const destPath = path.join(buildDir, build.fileName);
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      fs.copyFileSync(sourcePath, destPath);
    }

    server.buildId = targetBuildId;
    server.buildVersion = build.version;
    await this.serverRepository.save(server);

    const record: DeploymentRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      serverId,
      serverName: server.name,
      buildId: targetBuildId,
      buildVersion: build.version,
      status: 'rolled_back',
      startedAt: new Date(),
      completedAt: new Date(),
    };

    this.deploymentHistory.push(record);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'DEPLOYMENT_ROLLED_BACK',
      target: 'Server',
      targetId: serverId,
      module: 'Deployment',
      details: { buildId: targetBuildId, version: build.version },
    });

    return {
      id: record.id,
      serverId,
      serverName: server.name,
      buildId: targetBuildId,
      buildVersion: build.version,
      status: 'rolled_back',
      message: 'Rollback completed successfully',
    };
  }

  async getHistory(page = 1, limit = 20) {
    const start = (page - 1) * limit;
    const data = this.deploymentHistory.slice(start, start + limit);

    return {
      data,
      meta: {
        total: this.deploymentHistory.length,
        page,
        limit,
        totalPages: Math.ceil(this.deploymentHistory.length / limit),
      },
    };
  }

  async getStatus(id: string) {
    const record = this.deploymentHistory.find((d) => d.id === id);
    if (!record) {
      throw new NotFoundException('Deployment record not found');
    }
    return record;
  }

  private copyDirectorySync(src: string, dest: string) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectorySync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
