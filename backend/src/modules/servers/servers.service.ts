import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as archiver from 'archiver';
import * as AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';
import { Server, ServerStatus } from '../../database/entities/server.entity';
import { ServerBuild } from '../../database/entities/server-build.entity';
import { ServerMetric } from '../../database/entities/server-metric.entity';
import { ServerLog } from '../../database/entities/server-log.entity';
import { ServerConfig } from '../../database/entities/server-config.entity';
import { Player } from '../../database/entities/player.entity';
import { Backup, BackupType, BackupStatus } from '../../database/entities/backup.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { ServerMetricsService } from './server-metrics.service';
import { EngineAdapterFactory } from './adapters/engine-adapter.factory';
import { EngineAdapter, EngineType } from './adapters/engine-adapter.interface';
import { SystemMetricsService } from '../analytics/system-metrics.service';
import { AppGateway } from '../../websocket/websocket.gateway';
import { CreateServerDto, UpdateServerDto, ServerFilterDto, ExecuteCommandDto, CreateBackupDto, UpdateServerConfigDto } from './servers.dto';

@Injectable()
export class ServersService {
  private readonly logger = new Logger('ServersService');
  private readonly adapters: Map<string, EngineAdapter> = new Map();
  private readonly serverTokens: Map<string, string> = new Map();

  constructor(
    @InjectRepository(Server)
    private serverRepository: Repository<Server>,
    @InjectRepository(ServerBuild)
    private buildRepository: Repository<ServerBuild>,
    @InjectRepository(ServerMetric)
    private metricRepository: Repository<ServerMetric>,
    @InjectRepository(ServerLog)
    private logRepository: Repository<ServerLog>,
    @InjectRepository(ServerConfig)
    private configRepository: Repository<ServerConfig>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    @InjectRepository(Backup)
    private backupRepository: Repository<Backup>,
    private auditLogger: AuditLogger,
    private metricsService: ServerMetricsService,
    private engineAdapterFactory: EngineAdapterFactory,
    private systemMetrics: SystemMetricsService,
    private appGateway: AppGateway,
  ) {}

  private mapEngineStatus(status: string): ServerStatus {
    switch (status) {
      case 'starting': return ServerStatus.STARTING;
      case 'running': return ServerStatus.RUNNING;
      case 'stopping': return ServerStatus.STOPPING;
      case 'stopped': return ServerStatus.STOPPED;
      case 'crashed': return ServerStatus.CRASHED;
      default: return ServerStatus.STOPPED;
    }
  }

  private startMetricsCollection(serverId: string, adapter: EngineAdapter, playerCount: number, tickRate: number) {
    const interval = setInterval(async () => {
      try {
        const adapter_ = this.adapters.get(serverId);
        if (!adapter_?.isRunning()) {
          clearInterval(interval);
          return;
        }
        const metrics = await adapter_.collectMetrics();
        await this.metricsService.recordMetric(serverId, {
          cpuUsage: metrics.cpuUsage,
          ramUsage: metrics.ramUsageMb,
          playerCount: metrics.playerCount || playerCount,
          tickRate: metrics.tickRate || tickRate,
          networkIn: metrics.networkInBps,
          networkOut: metrics.networkOutBps,
        });
        await this.serverRepository.update(serverId, {
          cpuUsage: metrics.cpuUsage,
          ramUsage: metrics.ramUsageMb,
          uptime: metrics.uptimeSeconds,
        });
      } catch { /* ignore */ }
    }, 5000);
  }

  async generateServerToken(id: string, actorId?: string, actorName?: string) {
    const server = await this.findById(id);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    server.serverTokenHash = hash;
    await this.serverRepository.save(server);
    this.serverTokens.set(id, rawToken);
    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'SERVER_TOKEN_GENERATED',
      target: 'Server',
      targetId: id,
      module: 'Servers',
    });
    return { token: rawToken, serverId: id };
  }

  async getSystemAnalytics() {
    return this.systemMetrics.collectSystemMetrics();
  }

  async findAll(filters?: ServerFilterDto, page = 1, limit = 20) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const query = this.serverRepository.createQueryBuilder('server')
      .leftJoinAndSelect('server.owner', 'owner')
      .leftJoinAndSelect('server.build', 'build')
      .skip((p - 1) * l)
      .take(l)
      .orderBy('server.createdAt', 'DESC');

    if (filters?.status) {
      query.andWhere('server.status = :status', { status: filters.status });
    }
    if (filters?.region) {
      query.andWhere('server.region = :region', { region: filters.region });
    }
    if (filters?.buildVersion) {
      query.andWhere('server.buildVersion = :buildVersion', { buildVersion: filters.buildVersion });
    }

    const [servers, total] = await query.getManyAndCount();

    return {
      data: servers,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }

  async getStats() {
    const total = await this.serverRepository.count();
    const running = await this.serverRepository.count({ where: { status: ServerStatus.RUNNING } });
    const stopped = await this.serverRepository.count({ where: { status: ServerStatus.STOPPED } });
    const crashed = await this.serverRepository.count({ where: { status: ServerStatus.CRASHED } });
    const totalPlayers = await this.serverRepository
      .createQueryBuilder('server')
      .select('SUM(server.playerCount)', 'total')
      .getRawOne();

    const regionStats = await this.serverRepository
      .createQueryBuilder('server')
      .select('server.region', 'region')
      .addSelect('COUNT(*)', 'count')
      .groupBy('server.region')
      .getRawMany();

    return {
      total,
      running,
      stopped,
      crashed,
      totalPlayers: parseInt(totalPlayers?.total || '0', 10),
      regionStats,
    };
  }

  async findById(id: string) {
    const server = await this.serverRepository.findOne({
      where: { id },
      relations: ['owner', 'build', 'players'],
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    return server;
  }

  async create(dto: CreateServerDto, ownerId: string, actorName?: string) {
    const existingPort = await this.serverRepository.findOne({ where: { port: dto.port } });
    if (existingPort) {
      throw new ConflictException(`Port ${dto.port} is already in use`);
    }

    const existingQueryPort = await this.serverRepository.findOne({ where: { queryPort: dto.queryPort } });
    if (existingQueryPort) {
      throw new ConflictException(`Query port ${dto.queryPort} is already in use`);
    }

    if (!dto.serverDirectory || !fs.existsSync(dto.serverDirectory)) {
      throw new BadRequestException(`Server directory does not exist: ${dto.serverDirectory || '(not provided)'}`);
    }

    if (!dto.executablePath || !fs.existsSync(dto.executablePath)) {
      throw new BadRequestException(`Executable not found: ${dto.executablePath || '(not provided)'}`);
    }

    const server = this.serverRepository.create({
      name: dto.name,
      engineType: dto.engineType,
      description: dto.description || '',
      map: dto.map || 'DefaultMap',
      gameMode: dto.gameMode || 'DefaultGameMode',
      maxPlayers: dto.maxPlayers || 100,
      port: dto.port,
      queryPort: dto.queryPort,
      password: dto.password,
      buildVersion: dto.buildVersion,
      region: dto.region || 'US East',
      serverDirectory: dto.serverDirectory,
      executablePath: dto.executablePath,
      startupCommand: dto.startupCommand,
      autoRestart: dto.autoRestart || false,
      ownerId,
      buildId: dto.buildId,
    });

    await this.serverRepository.save(server);

    if (dto.buildId) {
      await this.metricsService.recordMetric(server.id, {
        cpuUsage: 0,
        ramUsage: 0,
        playerCount: 0,
        tickRate: 60,
      });
    }

    await this.auditLogger.log({
      userId: ownerId,
      username: actorName || 'system',
      action: 'SERVER_CREATED',
      target: 'Server',
      targetId: server.id,
      module: 'Servers',
      details: { name: dto.name, port: dto.port },
    });

    return this.findById(server.id);
  }

  async createWithZip(
    dto: CreateServerDto,
    file: Express.Multer.File,
    ownerId: string,
    actorName?: string,
  ) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.zip') {
      throw new BadRequestException('Only .zip files are accepted');
    }

    const existingPort = await this.serverRepository.findOne({ where: { port: dto.port } });
    if (existingPort) {
      throw new ConflictException(`Port ${dto.port} is already in use`);
    }
    const existingQueryPort = await this.serverRepository.findOne({ where: { queryPort: dto.queryPort } });
    if (existingQueryPort) {
      throw new ConflictException(`Query port ${dto.queryPort} is already in use`);
    }

    const serverId = uuidv4();
    const baseDir = path.resolve(process.env.UPLOAD_DIR || './data');
    const serverDir = path.join(baseDir, 'servers', serverId);

    this.logger.log(`[createWithZip] Creating server ${serverId} at ${serverDir}`);
    fs.mkdirSync(serverDir, { recursive: true });

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file buffer is empty – memoryStorage may not be active');
    }
    this.logger.log(`[createWithZip] file.buffer length: ${file.buffer.length} bytes`);

    const zip = new AdmZip(file.buffer);
    zip.extractAllTo(serverDir, true);
    this.logger.log(`[createWithZip] Extracted ${file.originalname} to ${serverDir}`);

    const resolvedRoot = this.resolveZipRoot(serverDir);
    this.logger.log(`[createWithZip] Resolved extraction root: ${resolvedRoot}`);

    let resolvedExePath: string | null = null;
    let resolvedServerDir: string = resolvedRoot;
    const warnings: string[] = [];

    try {
      resolvedExePath = this.findServerExecutable(resolvedRoot, dto.engineType);
      if (resolvedExePath) {
        resolvedServerDir = this.determineServerDirectory(resolvedExePath, resolvedRoot);
        this.logger.log(`[createWithZip] Executable found: ${resolvedExePath}`);
        this.logger.log(`[createWithZip] Server directory set to: ${resolvedServerDir}`);
      } else {
        const fallbackExe = this.findAnyExecutable(resolvedRoot);
        if (fallbackExe) {
          resolvedExePath = fallbackExe;
          resolvedServerDir = this.determineServerDirectory(fallbackExe, resolvedRoot);
          this.logger.log(`[createWithZip] Fallback executable found: ${fallbackExe}`);
          warnings.push(`Auto-detected ${fallbackExe} as executable. Verify in settings.`);
        } else {
          this.logger.warn(`[createWithZip] No ${dto.engineType} executable found in ${resolvedRoot}`);
          warnings.push('Server created, but executable could not be auto-detected. Please set it manually in Settings.');
        }
      }
    } catch (err) {
      this.logger.warn(`[createWithZip] Scanner error: ${err.message}`);
      warnings.push('Executable scanner encountered an error. Please set manually in Settings.');
    }

    if (resolvedExePath && dto.engineType === 'godot') {
      const pckFiles = this.findPckFiles(resolvedServerDir);
      if (pckFiles.length === 0) {
        warnings.push('No .pck file found alongside the executable. Godot server may not start without game data.');
      } else {
        this.logger.log(`[createWithZip] Godot .pck file detected: ${pckFiles[0]}`);
      }
    }

    const server = this.serverRepository.create({
      id: serverId,
      name: dto.name,
      engineType: dto.engineType,
      description: dto.description || '',
      map: dto.map || 'DefaultMap',
      gameMode: dto.gameMode || 'DefaultGameMode',
      maxPlayers: dto.maxPlayers || 100,
      port: dto.port,
      queryPort: dto.queryPort,
      password: dto.password,
      buildVersion: dto.buildVersion || '1.0.0',
      region: dto.region || 'US East',
      serverDirectory: resolvedServerDir,
      executablePath: resolvedExePath || '',
      startupCommand: dto.startupCommand,
      autoRestart: dto.autoRestart || false,
      status: ServerStatus.STOPPED,
      ownerId,
    });

    await this.serverRepository.save(server);

    await this.auditLogger.log({
      userId: ownerId,
      username: actorName || 'system',
      action: 'SERVER_CREATED_WITH_ZIP',
      target: 'Server',
      targetId: server.id,
      module: 'Servers',
      details: { name: dto.name, port: dto.port, engineType: dto.engineType, executablePath: resolvedExePath, warnings },
    });

    const result = await this.findById(server.id);
    return { ...result, warnings };
  }

  private resolveZipRoot(extractDir: string): string {
    try {
      if (!fs.existsSync(extractDir)) return extractDir;
      const entries = fs.readdirSync(extractDir, { withFileTypes: true });
      const dirs = entries.filter((e) => e.isDirectory());
      const files = entries.filter((e) => e.isFile());
      if (dirs.length === 1 && files.length === 0) {
        const nested = path.join(extractDir, dirs[0].name);
        this.logger.log(`[resolveZipRoot] Single subfolder detected: ${nested}`);
        const deeper = fs.readdirSync(nested, { withFileTypes: true });
        const deeperDirs = deeper.filter((e) => e.isDirectory());
        const deeperFiles = deeper.filter((e) => e.isFile());
        if (deeperDirs.length >= 1 || deeperFiles.length >= 1) {
          return this.resolveZipRoot(nested);
        }
      }
    } catch (err) {
      this.logger.warn(`[resolveZipRoot] Error: ${err.message}`);
    }
    return extractDir;
  }

  private determineServerDirectory(exePath: string, root: string): string {
    const exeDir = path.dirname(exePath);
    const parts = exeDir.replace(root, '').split(path.sep).filter(Boolean);
    const hasBinaries = parts.some((p) => p.toLowerCase() === 'binaries');
    if (hasBinaries) {
      const binIndex = parts.findIndex((p) => p.toLowerCase() === 'binaries');
      const keep = parts.slice(0, binIndex);
      return path.join(root, ...keep);
    }
    return exeDir;
  }

  private findAnyExecutable(dir: string): string | null {
    try {
      if (!fs.existsSync(dir)) return null;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = this.findAnyExecutable(fullPath);
          if (found) return found;
        } else if (entry.isFile()) {
          const lower = entry.name.toLowerCase();
          if (lower.endsWith('.exe')) {
            this.logger.log(`[findAnyExecutable] Windows executable: ${fullPath}`);
            return fullPath;
          }
          if (!lower.includes('.')) {
            this.logger.log(`[findAnyExecutable] Extensionless candidate: ${fullPath}`);
            return fullPath;
          }
        }
      }
    } catch (err) {
      this.logger.warn(`[findAnyExecutable] Error scanning ${dir}: ${err.message}`);
    }
    return null;
  }

  private findPckFiles(dir: string): string[] {
    try {
      if (!fs.existsSync(dir)) return [];
      const pckFiles: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.toLowerCase().endsWith('.pck')) {
          pckFiles.push(path.join(dir, entry.name));
        }
        if (entry.isDirectory()) {
          pckFiles.push(...this.findPckFiles(path.join(dir, entry.name)));
        }
      }
      return pckFiles;
    } catch (err) {
      this.logger.warn(`[findPckFiles] Error scanning ${dir}: ${err.message}`);
      return [];
    }
  }

  async update(id: string, dto: UpdateServerDto, actorId?: string, actorName?: string) {
    const server = await this.serverRepository.findOne({ where: { id } });
    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (dto.port && dto.port !== server.port) {
      const existing = await this.serverRepository.findOne({ where: { port: dto.port } });
      if (existing) throw new ConflictException(`Port ${dto.port} is already in use`);
      server.port = dto.port;
    }

    if (dto.queryPort && dto.queryPort !== server.queryPort) {
      const existing = await this.serverRepository.findOne({ where: { queryPort: dto.queryPort } });
      if (existing) throw new ConflictException(`Query port ${dto.queryPort} is already in use`);
      server.queryPort = dto.queryPort;
    }

    if (dto.name) server.name = dto.name;
    if (dto.description !== undefined) server.description = dto.description;
    if (dto.map) server.map = dto.map;
    if (dto.gameMode) server.gameMode = dto.gameMode;
    if (dto.maxPlayers) server.maxPlayers = dto.maxPlayers;
    if (dto.password !== undefined) server.password = dto.password;
    if (dto.buildVersion) server.buildVersion = dto.buildVersion;
    if (dto.region) server.region = dto.region;
    if (dto.serverDirectory) server.serverDirectory = dto.serverDirectory;
    if (dto.executablePath) server.executablePath = dto.executablePath;
    if (dto.startupCommand !== undefined) server.startupCommand = dto.startupCommand;
    if (dto.autoRestart !== undefined) server.autoRestart = dto.autoRestart;

    await this.serverRepository.save(server);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'SERVER_UPDATED',
      target: 'Server',
      targetId: id,
      module: 'Servers',
      details: dto,
    });

    return this.findById(id);
  }

  async delete(id: string, actorId?: string, actorName?: string) {
    const server = await this.serverRepository.findOne({ where: { id } });
    if (!server) {
      throw new NotFoundException('Server not found');
    }

    const adapter = this.adapters.get(id);
    if (adapter?.isRunning()) {
      await adapter.killServer();
    }
    this.adapters.delete(id);

    await this.serverRepository.remove(server);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'SERVER_DELETED',
      target: 'Server',
      targetId: id,
      module: 'Servers',
      details: { name: server.name },
    });

    return { message: 'Server deleted successfully' };
  }

  async startServer(id: string, actorId?: string, actorName?: string) {
    const server = await this.findById(id);

    if (server.status === ServerStatus.RUNNING) {
      throw new BadRequestException('Server is already running');
    }

    if (server.status === ServerStatus.STARTING) {
      throw new BadRequestException('Server is already starting');
    }

    const engineType = (server.engineType || 'godot') as unknown as EngineType;
    const adapter = this.engineAdapterFactory.createAdapter(engineType);

    adapter.on('log', async (logData: any) => {
      const logEntry = {
        serverId: id,
        level: logData.level || 'info',
        message: logData.message,
        timestamp: new Date().toISOString(),
      };
      try {
        await this.logRepository.save({
          serverId: id,
          level: logData.level || 'info',
          message: logData.message,
        });
        this.appGateway.sendServerLog(id, logEntry);
      } catch { /* ignore */ }
    });

    adapter.on('status', async (status: string) => {
      const mappedStatus = this.mapEngineStatus(status);
      await this.serverRepository.update(server.id, { status: mappedStatus });
      this.appGateway.sendServerStatus(id, { serverId: id, status: mappedStatus });
      if (status === 'crashed' && server.autoRestart) {
        this.logger.warn(`Server ${server.name} crashed, auto-restarting in 5s`);
        setTimeout(() => this.startServer(server.id, actorId, actorName), 5000);
      }
    });

    adapter.on('exit', async (exitData: any) => {
      const code = exitData?.code;
      this.logger.warn(`Server ${server.name} (${id}) exited with code ${code}`);
      this.adapters.delete(id);
    });

    this.adapters.set(id, adapter);

    let rawToken = this.serverTokens.get(id);
    if (!rawToken) {
      rawToken = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
      server.serverTokenHash = hash;
      this.serverTokens.set(id, rawToken);
      await this.serverRepository.save(server);
    }
    const args = [
      `-PORT=${server.port}`,
      `-QueryPort=${server.queryPort}`,
      `-MaxPlayers=${server.maxPlayers}`,
      `-MAP=${server.map}`,
      `-GameMode=${server.gameMode}`,
      `-BuildVersion=${server.buildVersion}`,
    ];
    args.push(`-server_token=${rawToken}`);
    if (server.password) args.push(`-Password=${server.password}`);

    try {
      const stats = await adapter.startServer(server.executablePath, server.serverDirectory, args);
      await this.serverRepository.update(server.id, {
        status: ServerStatus.RUNNING,
        processId: stats.pid,
        cpuUsage: stats.cpuUsage,
        ramUsage: stats.ramUsageMb,
      });

      this.startMetricsCollection(id, adapter, server.playerCount, server.tickRate);
    } catch (err) {
      await this.serverRepository.update(server.id, { status: ServerStatus.CRASHED });
      throw new BadRequestException(`Failed to start server: ${err.message}`);
    }

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'SERVER_STARTED',
      target: 'Server',
      targetId: id,
      module: 'Servers',
      details: { port: server.port, engineType },
    });

    return { message: 'Server started successfully', pid: adapter.getProcessStats().pid };
  }

  async stopServer(id: string, actorId?: string, actorName?: string) {
    const server = await this.findById(id);
    const adapter = this.adapters.get(id);

    if (!adapter || !adapter.isRunning()) {
      throw new BadRequestException('Server is not running');
    }

    await adapter.stopServer();
    this.adapters.delete(id);

    await this.serverRepository.update(id, {
      status: ServerStatus.STOPPED,
      processId: null as any,
      cpuUsage: 0,
      ramUsage: 0,
      playerCount: 0,
    });

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'SERVER_STOPPED',
      target: 'Server',
      targetId: id,
      module: 'Servers',
    });

    return { message: 'Server stopped successfully' };
  }

  async restartServer(id: string, actorId?: string, actorName?: string) {
    const server = await this.findById(id);
    const adapter = this.adapters.get(id);

    if (adapter?.isRunning()) {
      await this.stopServer(id, actorId, actorName);
      await new Promise((r) => setTimeout(r, 2000));
    }
    return this.startServer(id, actorId, actorName);
  }

  async killServer(id: string, actorId?: string, actorName?: string) {
    const adapter = this.adapters.get(id);

    if (adapter) {
      await adapter.killServer();
      this.adapters.delete(id);
    }

    await this.serverRepository.update(id, {
      status: ServerStatus.STOPPED,
      processId: null as any,
      cpuUsage: 0,
      ramUsage: 0,
    });

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'SERVER_KILLED',
      target: 'Server',
      targetId: id,
      module: 'Servers',
    });

    return { message: 'Server process killed' };
  }

  async cloneServer(id: string, newName: string, actorId?: string, actorName?: string) {
    const original = await this.findById(id);

    const newPort = original.port + 100;
    const newQueryPort = original.queryPort + 100;

    const newDir = `${original.serverDirectory}_clone_${uuidv4().slice(0, 8)}`;

    const cloneDto: CreateServerDto = {
      name: newName,
      engineType: (original.engineType || 'godot') as any,
      description: original.description,
      map: original.map,
      gameMode: original.gameMode,
      maxPlayers: original.maxPlayers,
      port: newPort,
      queryPort: newQueryPort,
      password: original.password,
      buildVersion: original.buildVersion,
      region: original.region,
      serverDirectory: newDir,
      executablePath: original.executablePath,
      startupCommand: original.startupCommand,
      autoRestart: original.autoRestart,
      buildId: original.buildId,
    };

    if (fs.existsSync(original.serverDirectory)) {
      this.copyDirectorySync(original.serverDirectory, newDir);
    }

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'SERVER_CLONED',
      target: 'Server',
      targetId: id,
      module: 'Servers',
      details: { newName, newDir },
    });

    return this.create(cloneDto, original.ownerId, actorName);
  }

  private readonly engineExecutables: Record<string, string[]> = {
    godot: ['godot_server.exe', 'godot.x86_64', 'server.x86_64', 'godot*', '*godot*'],
    unreal: ['UE4Server.exe', 'UE5Server.exe', 'GameServer.exe', 'YourProjectServer.exe', '*Server.exe'],
    unity: ['UnityPlayer.exe', 'GameAssembly.dll', 'UnityPlayer.so'],
  };

  async deployBuild(id: string, buildId: string, actorId?: string, actorName?: string) {
    const server = await this.findById(id);
    const build = await this.buildRepository.findOne({ where: { id: buildId } });
    if (!build) throw new NotFoundException('Build not found');

    if (build.status !== 'ready') {
      throw new BadRequestException(`Build is not ready (status: ${build.status})`);
    }

    if (!build.extractedPath || !fs.existsSync(build.extractedPath)) {
      throw new BadRequestException('Build extracted files not found on disk');
    }

    const executablePath = this.findServerExecutable(build.extractedPath, server.engineType);
    if (!executablePath) {
      throw new BadRequestException(`No ${server.engineType} executable found in build extraction`);
    }

    const wasRunning = server.status === ServerStatus.RUNNING;
    if (wasRunning) {
      const adapter = this.adapters.get(id);
      if (adapter?.isRunning()) {
        await adapter.stopServer();
      }
    }

    server.buildId = buildId;
    server.buildVersion = build.version;
    server.executablePath = executablePath;
    server.serverDirectory = build.extractedPath;
    await this.serverRepository.save(server);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'BUILD_DEPLOYED',
      target: 'Server',
      targetId: id,
      module: 'Servers',
      details: { buildId, version: build.version, executablePath },
    });

    if (wasRunning) {
      await this.startServer(id, actorId, actorName);
    }

    return {
      message: wasRunning
        ? 'Build deployed and server hot-restarted'
        : 'Build deployed successfully',
      serverId: id,
      buildId,
      executablePath,
    };
  }

  private findServerExecutable(dir: string, engineType: string): string | null {
    const patterns = this.engineExecutables[engineType] || [];
    const unrealDirs = ['Binaries', 'Binaries/Win64', 'Binaries/Linux'];
    this.logger.log(`[findServerExecutable] Scanning ${dir} for ${engineType} with patterns: ${patterns.join(', ')}`);

    let found = this.findFileRecursive(dir, patterns);
    if (!found && engineType === 'unreal') {
      for (const sub of unrealDirs) {
        const foundIn = this.findFileRecursive(path.join(dir, sub), patterns);
        if (foundIn) { found = foundIn; break; }
      }
    }
    if (found) {
      this.logger.log(`[findServerExecutable] MATCH: ${found}`);
    } else {
      this.logger.warn(`[findServerExecutable] No match in ${dir}`);
    }
    return found;
  }

  private findFileRecursive(dir: string, targets: string[]): string | null {
    try {
      if (!fs.existsSync(dir)) return null;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = this.findFileRecursive(fullPath, targets);
          if (found) return found;
        } else if (entry.isFile()) {
          const lower = entry.name.toLowerCase();
          this.logger.log(`[findFileRecursive] ${fullPath}`);
          for (const pattern of targets) {
            if (pattern.includes('*')) {
              const regex = new RegExp(
                '^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$',
                'i',
              );
              if (regex.test(lower)) return fullPath;
            } else if (lower === pattern.toLowerCase()) {
              return fullPath;
            }
          }
        }
      }
    } catch (err) {
      this.logger.warn(`[findFileRecursive] Error scanning ${dir}: ${err.message}`);
    }
    return null;
  }

  async updateBuild(id: string, buildId: string, actorId?: string, actorName?: string) {
    const server = await this.findById(id);
    const build = await this.buildRepository.findOne({ where: { id: buildId } });

    if (!build) {
      throw new NotFoundException('Build not found');
    }

    const wasRunning = server.status === ServerStatus.RUNNING;
    if (wasRunning) {
      const adapter = this.adapters.get(id);
      if (adapter?.isRunning()) {
        await adapter.stopServer();
      }
    }

    const buildDir = path.dirname(server.executablePath);
    const buildPath = build.filePath;

    if (fs.existsSync(buildPath)) {
      if (fs.lstatSync(buildPath).isDirectory()) {
        this.copyDirectorySync(buildPath, buildDir);
      } else {
        const destPath = path.join(buildDir, build.fileName);
        fs.copyFileSync(buildPath, destPath);
      }
    }

    server.buildId = buildId;
    server.buildVersion = build.version;
    await this.serverRepository.save(server);

    if (wasRunning) {
      await this.startServer(id, actorId, actorName);
    }

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'BUILD_UPDATED',
      target: 'Server',
      targetId: id,
      module: 'Servers',
      details: { buildId, version: build.version },
    });

    return { message: 'Build updated successfully', version: build.version };
  }

  async executeCommand(id: string, dto: ExecuteCommandDto, actorId?: string, actorName?: string) {
    const adapter = this.adapters.get(id);

    if (!adapter?.isRunning()) {
      throw new BadRequestException('Server is not running');
    }

    adapter.sendCommand(dto.command);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'COMMAND_EXECUTED',
      target: 'Server',
      targetId: id,
      module: 'Servers',
      details: { command: dto.command },
    });

    return { message: 'Command sent to server' };
  }

  async getMetrics(id: string, hours = 24) {
    await this.findById(id);
    return this.metricsService.getMetrics(id, hours);
  }

  async getPlayers(id: string) {
    await this.findById(id);
    return this.playerRepository.find({
      where: { serverId: id },
      order: { lastSeen: 'DESC' },
    });
  }

  async getLogs(id: string, page = 1, limit = 100, level?: string) {
    await this.findById(id);
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(500, Math.max(1, Number(limit) || 100));

    const query = this.logRepository.createQueryBuilder('log')
      .where('log.serverId = :serverId', { serverId: id })
      .skip((p - 1) * l)
      .take(l)
      .orderBy('log.timestamp', 'DESC');

    if (level) {
      query.andWhere('log.level = :level', { level });
    }

    const [logs, total] = await query.getManyAndCount();

    return {
      data: logs,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }

  async getBackups(id: string) {
    await this.findById(id);
    return this.backupRepository.find({
      where: { serverId: id },
      order: { createdAt: 'DESC' },
    });
  }

  async createBackup(id: string, dto: CreateBackupDto, actorId?: string, actorName?: string) {
    const server = await this.findById(id);

    const backupDir = path.join(process.env.UPLOAD_DIR || './uploads', 'backups', id);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupName = dto.name || `backup_${Date.now()}`;
    const backupPath = path.join(backupDir, `${backupName}.zip`);

    const backup = this.backupRepository.create({
      serverId: id,
      name: backupName,
      filePath: backupPath,
      fileSize: 0,
      type: (dto.type as BackupType) || BackupType.MANUAL,
      status: BackupStatus.IN_PROGRESS,
    });

    await this.backupRepository.save(backup);

    try {
      await this.createZipArchive(server.serverDirectory, backupPath);

      const stats = fs.statSync(backupPath);
      backup.fileSize = stats.size;
      backup.status = BackupStatus.COMPLETED;
      await this.backupRepository.save(backup);
    } catch (err) {
      backup.status = BackupStatus.FAILED;
      await this.backupRepository.save(backup);
      throw new BadRequestException(`Backup failed: ${err.message}`);
    }

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'BACKUP_CREATED',
      target: 'Server',
      targetId: id,
      module: 'Servers',
      details: { backupName },
    });

    return backup;
  }

  async restoreBackup(serverId: string, backupId: string, actorId?: string, actorName?: string) {
    const server = await this.findById(serverId);
    const backup = await this.backupRepository.findOne({ where: { id: backupId, serverId } });

    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    const adapter = this.adapters.get(serverId);
    if (adapter?.isRunning()) {
      await adapter.stopServer();
    }

    if (!fs.existsSync(backup.filePath)) {
      throw new BadRequestException('Backup file not found');
    }

    const extractZip = (await import('extract-zip')).default;
    await extractZip(backup.filePath, { dir: server.serverDirectory });

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'BACKUP_RESTORED',
      target: 'Server',
      targetId: serverId,
      module: 'Servers',
      details: { backupId, backupName: backup.name },
    });

    return { message: 'Backup restored successfully' };
  }

  async getConfig(serverId: string) {
    await this.findById(serverId);
    const config = await this.configRepository.findOne({ where: { serverId } });

    if (!config) {
      return { serverId, configData: {}, configVersion: 0 };
    }

    return config;
  }

  async updateConfig(serverId: string, dto: UpdateServerConfigDto, userId?: string, actorName?: string) {
    await this.findById(serverId);

    let config: ServerConfig | null = await this.configRepository.findOne({ where: { serverId } });

    if (config) {
      config.configData = dto.configData;
      config.configVersion += 1;
      config.updatedBy = userId || null;
    } else {
      config = this.configRepository.create({
        serverId,
        configData: dto.configData,
        configVersion: 1,
        updatedBy: userId || null,
      } as any) as unknown as ServerConfig;
    }

    if (config) {
      await this.configRepository.save(config as any);

      await this.auditLogger.log({
        userId,
        username: actorName || 'system',
        action: 'CONFIG_UPDATED',
        target: 'Server',
        targetId: serverId,
        module: 'Servers',
        details: { configVersion: config.configVersion },
      });
    }

    return config;
  }

  @Cron('*/30 * * * *')
  async healthCheck() {
    const servers = await this.serverRepository.find({ where: { status: ServerStatus.RUNNING } });

    for (const server of servers) {
      const adapter = this.adapters.get(server.id);

      if (!adapter || !adapter.isRunning()) {
        await this.serverRepository.update(server.id, {
          status: ServerStatus.CRASHED,
          processId: null as any,
        });

        if (server.autoRestart) {
          this.logger.log(`Auto-restarting server ${server.name}`);
          this.startServer(server.id).catch((e) => this.logger.error(`Auto-restart failed: ${e.message}`));
        }
      }
    }
  }

  @Cron('0 3 * * *')
  async cleanupOldMetrics() {
    await this.metricsService.cleanupOldMetrics(30);
  }

  private async createZipArchive(sourceDir: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive: any = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
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
