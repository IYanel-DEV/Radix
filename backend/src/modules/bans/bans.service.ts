import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Ban } from '../../database/entities/ban.entity';
import { Player } from '../../database/entities/player.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { CreateBanDto, UpdateBanDto, SearchBanDto } from './bans.dto';

@Injectable()
export class BansService {
  constructor(
    @InjectRepository(Ban)
    private banRepository: Repository<Ban>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    private auditLogger: AuditLogger,
  ) {}

  async findAll(page = 1, limit = 20, isActive?: boolean) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const query = this.banRepository.createQueryBuilder('ban')
      .leftJoinAndSelect('ban.bannedByUser', 'bannedByUser')
      .leftJoinAndSelect('ban.player', 'player')
      .skip((p - 1) * l)
      .take(l)
      .orderBy('ban.createdAt', 'DESC');

    if (isActive !== undefined) {
      query.andWhere('ban.isActive = :isActive', { isActive });
    }

    const [bans, total] = await query.getManyAndCount();

    return {
      data: bans,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }

  async findById(id: string) {
    const ban = await this.banRepository.findOne({
      where: { id },
      relations: ['bannedByUser', 'player'],
    });

    if (!ban) {
      throw new NotFoundException('Ban not found');
    }

    return ban;
  }

  async create(dto: CreateBanDto, bannedBy: string, actorName?: string) {
    const ban = this.banRepository.create({
      playerId: dto.playerId || null,
      playerUsername: dto.playerUsername,
      ipAddress: dto.ipAddress || null,
      reason: dto.reason,
      bannedBy,
      isPermanent: dto.isPermanent || false,
      expiresAt: dto.expiresAt || null,
      appealNotes: dto.appealNotes || null,
      isActive: true,
    } as any) as unknown as Ban;
    await this.banRepository.save(ban as any);

    if (dto.playerId) {
      await this.playerRepository.update(dto.playerId, { isBanned: true });
    }

    await this.auditLogger.log({
      userId: bannedBy,
      username: actorName || 'system',
      action: 'BAN_CREATED',
      target: 'Ban',
      targetId: ban.id,
      module: 'Bans',
      details: { playerUsername: dto.playerUsername, reason: dto.reason },
    });

    return this.findById(ban.id);
  }

  async update(id: string, dto: UpdateBanDto, actorId?: string, actorName?: string) {
    const ban = await this.banRepository.findOne({ where: { id } });
    if (!ban) {
      throw new NotFoundException('Ban not found');
    }

    if (dto.reason !== undefined) ban.reason = dto.reason;
    if (dto.isActive !== undefined) {
      ban.isActive = dto.isActive;
      if (ban.playerId && !dto.isActive) {
        await this.playerRepository.update(ban.playerId, { isBanned: false });
      }
    }
    if (dto.isPermanent !== undefined) ban.isPermanent = dto.isPermanent;
    if (dto.expiresAt !== undefined) ban.expiresAt = dto.expiresAt;
    if (dto.appealNotes !== undefined) ban.appealNotes = dto.appealNotes;

    await this.banRepository.save(ban);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'BAN_UPDATED',
      target: 'Ban',
      targetId: id,
      module: 'Bans',
      details: dto,
    });

    return this.findById(id);
  }

  async delete(id: string, actorId?: string, actorName?: string) {
    const ban = await this.banRepository.findOne({ where: { id } });
    if (!ban) {
      throw new NotFoundException('Ban not found');
    }

    if (ban.playerId) {
      await this.playerRepository.update(ban.playerId, { isBanned: false });
    }

    await this.banRepository.remove(ban);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'BAN_DELETED',
      target: 'Ban',
      targetId: id,
      module: 'Bans',
      details: { playerUsername: ban.playerUsername },
    });

    return { message: 'Ban deleted successfully' };
  }

  async search(dto: SearchBanDto) {
    const query = this.banRepository.createQueryBuilder('ban')
      .leftJoinAndSelect('ban.bannedByUser', 'bannedByUser')
      .leftJoinAndSelect('ban.player', 'player')
      .orderBy('ban.createdAt', 'DESC');

    if (dto.username) {
      query.andWhere('ban.playerUsername ILIKE :username', { username: `%${dto.username}%` });
    }

    if (dto.ipAddress) {
      query.andWhere('ban.ipAddress = :ipAddress', { ipAddress: dto.ipAddress });
    }

    if (dto.isActive !== undefined) {
      query.andWhere('ban.isActive = :isActive', { isActive: dto.isActive });
    }

    return query.getMany();
  }
}
