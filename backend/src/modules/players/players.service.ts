import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Player } from '../../database/entities/player.entity';
import { Ban } from '../../database/entities/ban.entity';
import { Warning } from '../../database/entities/warning.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { ServerProcessManager } from '../servers/server-process.manager';
import { KickPlayerDto, BanPlayerDto, MutePlayerDto, WarnPlayerDto, TeleportPlayerDto, MessagePlayerDto } from './players.dto';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    @InjectRepository(Ban)
    private banRepository: Repository<Ban>,
    @InjectRepository(Warning)
    private warningRepository: Repository<Warning>,
    private auditLogger: AuditLogger,
  ) {}

  async findAll(page = 1, limit = 20, search?: string, serverId?: string) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const query = this.playerRepository.createQueryBuilder('player')
      .leftJoinAndSelect('player.server', 'server')
      .skip((p - 1) * l)
      .take(l)
      .orderBy('player.lastSeen', 'DESC');

    if (search) {
      query.where(
        'player.username ILIKE :search OR player.playerId ILIKE :search OR player.ipAddress ILIKE :search',
        { search: `%${search}%` },
      );
    }

    if (serverId) {
      query.andWhere('player.serverId = :serverId', { serverId });
    }

    const [players, total] = await query.getManyAndCount();

    return {
      data: players,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }

  async findById(id: string) {
    const player = await this.playerRepository.findOne({
      where: { id },
      relations: ['server', 'bans', 'stats'],
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return player;
  }

  async kickPlayer(id: string, dto: KickPlayerDto, actorId?: string, actorName?: string) {
    const player = await this.findById(id);
    if (!player.serverId) {
      throw new BadRequestException('Player is not connected to a server');
    }

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'PLAYER_KICKED',
      target: 'Player',
      targetId: id,
      module: 'Players',
      details: { playerUsername: player.username, reason: dto.reason },
    });

    return { message: `Player ${player.username} has been kicked`, reason: dto.reason };
  }

  async banPlayer(id: string, dto: BanPlayerDto, actorId?: string, actorName?: string) {
    const player = await this.findById(id);

    const ban = this.banRepository.create({
      playerId: player.id,
      playerUsername: player.username,
      ipAddress: player.ipAddress,
      reason: dto.reason,
      bannedBy: actorId,
      isPermanent: dto.isPermanent || false,
      expiresAt: dto.expiresAt,
      isActive: true,
    });

    await this.banRepository.save(ban);

    player.isBanned = true;
    await this.playerRepository.save(player);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'PLAYER_BANNED',
      target: 'Player',
      targetId: id,
      module: 'Players',
      details: { playerUsername: player.username, reason: dto.reason, permanent: dto.isPermanent },
    });

    return { message: `Player ${player.username} has been banned`, ban };
  }

  async mutePlayer(id: string, dto: MutePlayerDto, actorId?: string, actorName?: string) {
    const player = await this.findById(id);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'PLAYER_MUTED',
      target: 'Player',
      targetId: id,
      module: 'Players',
      details: { playerUsername: player.username, reason: dto.reason, duration: dto.durationMinutes },
    });

    return { message: `Player ${player.username} has been muted`, reason: dto.reason };
  }

  async warnPlayer(id: string, dto: WarnPlayerDto, actorId?: string, actorName?: string) {
    const player = await this.findById(id);

    const warning = this.warningRepository.create({
      playerId: player.id,
      issuedBy: actorId,
      reason: dto.reason,
    });

    await this.warningRepository.save(warning);

    player.warnings += 1;
    await this.playerRepository.save(player);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'PLAYER_WARNED',
      target: 'Player',
      targetId: id,
      module: 'Players',
      details: { playerUsername: player.username, reason: dto.reason, totalWarnings: player.warnings },
    });

    return { message: `Player ${player.username} has been warned`, warning };
  }

  async teleportPlayer(id: string, dto: TeleportPlayerDto, actorId?: string, actorName?: string) {
    const player = await this.findById(id);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'PLAYER_TELEPORTED',
      target: 'Player',
      targetId: id,
      module: 'Players',
      details: { playerUsername: player.username, x: dto.x, y: dto.y, z: dto.z },
    });

    return { message: `Player ${player.username} teleported to (${dto.x}, ${dto.y}, ${dto.z})` };
  }

  async messagePlayer(id: string, dto: MessagePlayerDto, actorId?: string, actorName?: string) {
    const player = await this.findById(id);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'PLAYER_MESSAGED',
      target: 'Player',
      targetId: id,
      module: 'Players',
      details: { playerUsername: player.username, message: dto.message },
    });

    return { message: `Message sent to ${player.username}`, content: dto.message };
  }
}
