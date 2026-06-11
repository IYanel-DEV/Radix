import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServerConfig } from '../../database/entities/server-config.entity';
import { Server } from '../../database/entities/server.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { UpdateConfigDto, ConfigTemplateDto } from './configuration.dto';

@Injectable()
export class ConfigurationService {
  private readonly templates: ConfigTemplateDto[] = [
    {
      name: 'default',
      description: 'Default game server configuration',
      configData: {
        serverName: 'My Game Server',
        maxPlayers: 100,
        gameMode: 'DefaultGameMode',
        map: 'DefaultMap',
        tickRate: 60,
        adminPassword: '',
        enableVAC: true,
        enableCheats: false,
        enableDownloads: true,
        enableFileTransfer: true,
        enableVoiceChat: true,
        serverRegion: 'US East',
        banList: [],
        adminList: [],
      },
    },
    {
      name: 'competitive',
      description: 'Competitive game server configuration',
      configData: {
        serverName: 'Competitive Server',
        maxPlayers: 32,
        gameMode: 'Competitive',
        map: 'de_dust2',
        tickRate: 128,
        adminPassword: '',
        enableVAC: true,
        enableCheats: false,
        enableDownloads: true,
        enableFileTransfer: false,
        enableVoiceChat: true,
        serverRegion: 'US East',
        banList: [],
        adminList: [],
      },
    },
    {
      name: 'community',
      description: 'Community game server configuration',
      configData: {
        serverName: 'Community Server',
        maxPlayers: 64,
        gameMode: 'Community',
        map: 'DefaultMap',
        tickRate: 60,
        adminPassword: '',
        enableVAC: true,
        enableCheats: false,
        enableDownloads: true,
        enableFileTransfer: true,
        enableVoiceChat: true,
        serverRegion: 'US East',
        banList: [],
        adminList: [],
      },
    },
  ];

  constructor(
    @InjectRepository(ServerConfig)
    private configRepository: Repository<ServerConfig>,
    @InjectRepository(Server)
    private serverRepository: Repository<Server>,
    private auditLogger: AuditLogger,
  ) {}

  async getConfig(serverId: string) {
    const server = await this.serverRepository.findOne({ where: { id: serverId } });
    if (!server) {
      throw new NotFoundException('Server not found');
    }

    const config = await this.configRepository.findOne({
      where: { serverId },
      relations: ['updatedByUser'],
    });

    if (!config) {
      return {
        serverId,
        configData: this.getDefaultConfig(),
        configVersion: 0,
      };
    }

    return config;
  }

  async updateConfig(serverId: string, dto: UpdateConfigDto, userId?: string, actorName?: string) {
    const server = await this.serverRepository.findOne({ where: { id: serverId } });
    if (!server) {
      throw new NotFoundException('Server not found');
    }

    let config: ServerConfig | null = await this.configRepository.findOne({ where: { serverId } });

    if (config) {
      config.configData = { ...config.configData, ...dto.configData };
      config.configVersion += 1;
      config.updatedBy = userId || null;
    } else {
      config = this.configRepository.create({
        serverId,
        configData: dto.configData || this.getDefaultConfig(),
        configVersion: 1,
        updatedBy: userId || null,
      } as any) as unknown as ServerConfig;
    }

    if (config) {
      await this.configRepository.save(config as any);

      await this.auditLogger.log({
        userId,
        username: actorName || 'system',
        action: 'SERVER_CONFIG_UPDATED',
        target: 'ServerConfig',
        targetId: serverId,
        module: 'Configuration',
        details: { configVersion: config.configVersion },
      });
    }

    return config;
  }

  async getTemplates(): Promise<ConfigTemplateDto[]> {
    return this.templates;
  }

  async applyTemplate(serverId: string, templateName: string, userId?: string, actorName?: string) {
    const template = this.templates.find((t) => t.name === templateName);
    if (!template) {
      throw new NotFoundException(`Template '${templateName}' not found`);
    }

    return this.updateConfig(serverId, { configData: template.configData }, userId, actorName);
  }

  private getDefaultConfig(): Record<string, any> {
    return {
      serverName: 'Game Server',
      maxPlayers: 100,
      gameMode: 'DefaultGameMode',
      map: 'DefaultMap',
      tickRate: 60,
      enableVAC: true,
      enableCheats: false,
    };
  }
}
