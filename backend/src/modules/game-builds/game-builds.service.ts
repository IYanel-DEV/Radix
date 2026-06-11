import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';
import { ServerBuild } from '../../database/entities/server-build.entity';
import { Server, ServerStatus } from '../../database/entities/server.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { AppGateway } from '../../websocket/websocket.gateway';

@Injectable()
export class GameBuildsService {
  private readonly logger = new Logger('GameBuildsService');
  private readonly rawDir: string;

  constructor(
    @InjectRepository(ServerBuild)
    private buildRepository: Repository<ServerBuild>,
    @InjectRepository(Server)
    private serverRepository: Repository<Server>,
    private auditLogger: AuditLogger,
    private appGateway: AppGateway,
  ) {
    const base = path.resolve(process.env.UPLOAD_DIR || './data');
    this.rawDir = path.join(base, 'builds');
    fs.mkdirSync(this.rawDir, { recursive: true });
  }

  private streamLog(serverId: string, message: string) {
    const entry = { serverId, level: 'info', message, timestamp: new Date().toISOString() };
    this.appGateway.sendServerLog(serverId, entry);
  }

  async uploadBuild(file: Express.Multer.File, versionTag: string, engineType: string, actorId?: string, actorName?: string) {
    const allowed = ['godot', 'unreal', 'unity', 'custom'];
    if (!allowed.includes(engineType)) {
      throw new BadRequestException(`Invalid engine type: ${engineType}`);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.zip') {
      throw new BadRequestException('Only .zip files are accepted');
    }

    const buildId = uuidv4();
    const rawFileName = `${buildId}.zip`;
    const rawFilePath = path.join(this.rawDir, rawFileName);

    fs.writeFileSync(rawFilePath, file.buffer);

    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const tag = versionTag || this.extractVersionFromFileName(file.originalname) || '1.0.0';

    let build = this.buildRepository.create({
      id: buildId,
      version: tag,
      fileName: file.originalname,
      filePath: rawFilePath,
      fileSize: file.size,
      checksum,
      engineType,
      uploadedBy: actorId,
      status: 'ready',
    });

    build = await this.buildRepository.save(build);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'BUILD_UPLOADED',
      target: 'ServerBuild',
      targetId: buildId,
      module: 'GameBuilds',
      details: { fileName: file.originalname, versionTag: tag, engineType, size: file.size },
    });

    this.logger.log(`Build ${buildId} (${tag}) uploaded to ${rawFilePath}`);
    return build;
  }

  async getAllBuilds(engineType?: string, page?: number | string, limit?: number | string) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const where: any = {};
    if (engineType) where.engineType = engineType;

    const [builds, total] = await this.buildRepository.findAndCount({
      where,
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: builds.map((b) => ({ ...b, versionTag: b.version })),
      meta: { total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) },
    };
  }

  async getBuildById(id: string) {
    const build = await this.buildRepository.findOne({ where: { id } });
    if (!build) throw new NotFoundException('Build not found');
    return { ...build, versionTag: build.version };
  }

  async deleteBuild(id: string, actorId?: string, actorName?: string) {
    const build = await this.buildRepository.findOne({ where: { id } });
    if (!build) throw new NotFoundException('Build not found');

    if (fs.existsSync(build.filePath)) {
      fs.unlinkSync(build.filePath);
    }
    if (build.extractedPath && fs.existsSync(build.extractedPath)) {
      fs.rmSync(build.extractedPath, { recursive: true, force: true });
    }

    await this.buildRepository.remove(build);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'BUILD_DELETED',
      target: 'ServerBuild',
      targetId: id,
      module: 'GameBuilds',
      details: { version: build.version, fileName: build.fileName },
    });

    return { message: 'Build deleted successfully' };
  }

  async deployBuildToServer(serverId: string, buildId: string, actorId?: string, actorName?: string) {
    const server = await this.serverRepository.findOne({ where: { id: serverId }, relations: ['build'] });
    if (!server) throw new NotFoundException('Server not found');

    const build = await this.buildRepository.findOne({ where: { id: buildId } });
    if (!build) throw new NotFoundException('Build not found');
    if (build.status !== 'ready') {
      throw new BadRequestException(`Build is not ready (status: ${build.status})`);
    }
    if (!fs.existsSync(build.filePath)) {
      throw new BadRequestException('Build zip file not found on disk');
    }

    const serverDir = path.resolve(server.serverDirectory);
    if (!fs.existsSync(serverDir)) {
      throw new BadRequestException(`Server directory does not exist: ${serverDir}`);
    }

    this.streamLog(serverId, `[RADIX DEPLOYER] Initiating deployment of build ${build.version} to server "${server.name}"...`);

    const adapter = (global as any).__radixAdapters?.get?.(serverId);

    if (adapter?.isRunning?.() || server.status === ServerStatus.RUNNING || server.status === ServerStatus.STARTING) {
      this.streamLog(serverId, '[RADIX DEPLOYER] Server is running. Performing safety shutdown...');
      if (adapter?.stopServer) {
        await adapter.stopServer();
      } else if (adapter?.killServer) {
        await adapter.killServer();
      }
      (global as any).__radixAdapters?.delete?.(serverId);
    }

    await this.serverRepository.update(serverId, { status: ServerStatus.UPDATING as any });
    this.streamLog(serverId, '[RADIX DEPLOYER] Server state set to UPDATING. Purging old build files...');

    const preserveExtensions = ['.json', '.env', '.yaml', '.yml', '.toml', '.cfg', '.ini'];
    const preserveFiles = ['server_identity.txt', '.gitkeep'];
    const entries = fs.readdirSync(serverDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(serverDir, entry.name);
      const ext = path.extname(entry.name).toLowerCase();
      if (preserveExtensions.includes(ext)) continue;
      if (preserveFiles.includes(entry.name)) continue;
      if (entry.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }

    this.streamLog(serverId, `[RADIX DEPLOYER] Extracting ${build.version} into server directory...`);

    try {
      const zip = new AdmZip(build.filePath);
      zip.extractAllTo(serverDir, true);
    } catch (err) {
      await this.serverRepository.update(serverId, { status: ServerStatus.CRASHED as any });
      this.streamLog(serverId, `[RADIX DEPLOYER] ERROR: Extraction failed: ${err.message}`);
      throw new BadRequestException(`Build extraction failed: ${err.message}`);
    }

    server.buildId = buildId;
    server.buildVersion = build.version;
    await this.serverRepository.save(server);

    await this.serverRepository.update(serverId, { status: ServerStatus.STOPPED as any });
    this.streamLog(serverId, `[RADIX DEPLOYER] Deploy Success! Build ${build.version} deployed to server "${server.name}". Server is now STOPPED and ready to start.`);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'BUILD_DEPLOYED_TO_SERVER',
      target: 'Server',
      targetId: serverId,
      module: 'GameBuilds',
      details: { buildId, version: build.version, serverName: server.name },
    });

    return {
      message: `Build ${build.version} deployed to server successfully`,
      serverId,
      buildId,
      versionTag: build.version,
    };
  }

  private extractVersionFromFileName(fileName: string): string | null {
    const versionMatch = fileName.match(/(\d+\.\d+\.\d+(?:\.\d+)?)/);
    return versionMatch ? versionMatch[1] : null;
  }
}
