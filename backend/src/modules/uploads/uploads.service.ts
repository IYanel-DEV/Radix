import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';
import { ServerBuild } from '../../database/entities/server-build.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { EngineType } from '../../database/entities/server.entity';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger('UploadsService');
  private readonly rawDir: string;
  private readonly extractBaseDir: string;

  constructor(
    @InjectRepository(ServerBuild)
    private buildRepository: Repository<ServerBuild>,
    private auditLogger: AuditLogger,
  ) {
    const base = path.resolve(process.env.UPLOAD_DIR || './data');
    this.rawDir = path.join(base, 'uploads', 'raw');
    this.extractBaseDir = path.join(base, 'builds', 'extracted');
    fs.mkdirSync(this.rawDir, { recursive: true });
    fs.mkdirSync(this.extractBaseDir, { recursive: true });
  }

  engineExecutables: Record<string, string[]> = {
    godot: ['godot_server.exe', 'godot.x86_64', 'server.x86_64'],
    unreal: ['UE4Server.exe', 'UE5Server.exe', 'GameServer.exe', 'YourProjectServer.exe'],
    unity: ['UnityPlayer.exe', 'GameAssembly.dll', 'UnityPlayer.so'],
  };

  async uploadBuild(
    file: Express.Multer.File,
    engineType: string,
    actorId?: string,
    actorName?: string,
  ) {
    if (!['godot', 'unreal', 'unity'].includes(engineType)) {
      throw new BadRequestException(`Invalid engine type: ${engineType}`);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.zip') {
      throw new BadRequestException('Only .zip files are accepted');
    }

    const buildId = uuidv4();
    const rawFileName = `${buildId}.zip`;
    const rawFilePath = path.join(this.rawDir, rawFileName);
    const extractDir = path.join(this.extractBaseDir, buildId);

    fs.writeFileSync(rawFilePath, file.buffer);

    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const version = this.extractVersionFromFileName(file.originalname) || '1.0.0';

    let build = this.buildRepository.create({
      version,
      fileName: file.originalname,
      filePath: rawFilePath,
      fileSize: file.size,
      checksum,
      engineType,
      uploadedBy: actorId,
      status: 'uploading',
    });

    build = await this.buildRepository.save(build);

    try {
      await this.extractAndValidate(buildId, rawFilePath, extractDir, engineType);

      build.extractedPath = extractDir;
      build.status = 'ready';
      await this.buildRepository.save(build);

      this.logger.log(`Build ${buildId} (${version}) extracted to ${extractDir}`);
    } catch (err) {
      build.status = 'failed';
      await this.buildRepository.save(build);

      if (fs.existsSync(extractDir)) {
        fs.rmSync(extractDir, { recursive: true, force: true });
      }

      this.logger.error(`Build ${buildId} extraction failed: ${err.message}`);
      throw new BadRequestException(`Build extraction failed: ${err.message}`);
    }

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'BUILD_UPLOADED',
      target: 'ServerBuild',
      targetId: build.id,
      module: 'Uploads',
      details: { fileName: file.originalname, version, engineType, size: file.size },
    });

    return build;
  }

  private async extractAndValidate(
    buildId: string,
    zipPath: string,
    extractDir: string,
    engineType: string,
  ): Promise<void> {
    fs.mkdirSync(extractDir, { recursive: true });

    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractDir, true);
    } catch (err) {
      throw new Error(`Failed to extract zip: ${err.message}`);
    }

    const executables = this.engineExecutables[engineType] || [];
    const found = this.findExecutable(extractDir, executables);

    if (!found) {
      const allowedList = executables.join(', ');
      throw new Error(
        `No valid ${engineType} executable found in archive (expected: ${allowedList})`,
      );
    }

    this.logger.log(`Build ${buildId}: validated ${engineType} executable at ${found}`);
  }

  private findExecutable(dir: string, executables: string[]): string | null {
    if (!fs.existsSync(dir)) return null;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const found = this.findExecutable(fullPath, executables);
        if (found) return found;
      } else if (entry.isFile()) {
        const lowerName = entry.name.toLowerCase();
        if (executables.some((exe) => lowerName === exe.toLowerCase())) {
          return fullPath;
        }
        const nativeExe = executables.find((exe) => {
          const baseName = path.basename(exe).toLowerCase();
          return lowerName === baseName;
        });
        if (nativeExe) return fullPath;
      }
    }

    return null;
  }

  findExecutablePath(extractedDir: string, engineType: string): string | null {
    const executables = this.engineExecutables[engineType] || [];
    return this.findExecutable(extractedDir, executables);
  }

  async verifyBuild(buildId: string) {
    const build = await this.buildRepository.findOne({ where: { id: buildId } });
    if (!build) throw new NotFoundException('Build not found');

    if (!fs.existsSync(build.filePath)) {
      throw new BadRequestException('Build file not found on disk');
    }

    const fileBuffer = fs.readFileSync(build.filePath);
    const actualChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const checksumValid = actualChecksum === build.checksum;
    const stats = fs.statSync(build.filePath);
    const sizeValid = stats.size === Number(build.fileSize);

    return {
      id: build.id,
      version: build.version,
      checksumValid,
      sizeValid,
      actualChecksum,
      expectedChecksum: build.checksum,
      fileSize: stats.size,
      expectedSize: Number(build.fileSize),
      isIntact: checksumValid && sizeValid,
    };
  }

  async deployBuild(buildId: string, actorId?: string, actorName?: string) {
    const build = await this.buildRepository.findOne({ where: { id: buildId } });
    if (!build) throw new NotFoundException('Build not found');

    await this.buildRepository.update({ isActive: true }, { isActive: false });

    build.isActive = true;
    build.deployedAt = new Date();
    build.isRollback = false;
    await this.buildRepository.save(build);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'BUILD_DEPLOYED',
      target: 'ServerBuild',
      targetId: buildId,
      module: 'Uploads',
      details: { version: build.version },
    });

    return { message: 'Build deployed successfully', build };
  }

  async rollbackBuild(buildId: string, actorId?: string, actorName?: string) {
    const build = await this.buildRepository.findOne({ where: { id: buildId } });
    if (!build) throw new NotFoundException('Build not found');

    await this.buildRepository.update({ isActive: true }, { isActive: false });

    build.isActive = true;
    build.isRollback = true;
    await this.buildRepository.save(build);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'BUILD_ROLLED_BACK',
      target: 'ServerBuild',
      targetId: buildId,
      module: 'Uploads',
      details: { version: build.version },
    });

    return { message: 'Build rolled back successfully', build };
  }

  async getAllBuilds(
    engineType?: string,
    page?: number | string,
    limit?: number | string,
  ) {
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
      data: builds,
      meta: { total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) },
    };
  }

  async getBuildById(id: string) {
    const build = await this.buildRepository.findOne({ where: { id } });
    if (!build) throw new NotFoundException('Build not found');
    return build;
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
      module: 'Uploads',
      details: { version: build.version, fileName: build.fileName },
    });

    return { message: 'Build deleted successfully' };
  }

  private extractVersionFromFileName(fileName: string): string | null {
    const versionMatch = fileName.match(/(\d+\.\d+\.\d+(?:\.\d+)?)/);
    return versionMatch ? versionMatch[1] : null;
  }
}
