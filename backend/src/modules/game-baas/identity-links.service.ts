import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityLink, Platform } from '../../database/entities/identity-link.entity';
import { GamePlayer } from '../../database/entities/game-player.entity';

@Injectable()
export class IdentityLinksService {
  constructor(
    @InjectRepository(IdentityLink)
    private identityRepository: Repository<IdentityLink>,
    @InjectRepository(GamePlayer)
    private playerRepository: Repository<GamePlayer>,
  ) {}

  async linkIdentity(
    playerId: string,
    platform: Platform,
    platformId: string,
  ): Promise<IdentityLink> {
    const existing = await this.identityRepository.findOne({
      where: { platform, platformId },
    });

    if (existing) {
      throw new ConflictException(`This ${platform} account is already linked to another player`);
    }

    const player = await this.playerRepository.findOne({ where: { id: playerId } });
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    const link = this.identityRepository.create({
      playerId,
      platform,
      platformId,
      linkedAt: new Date(),
    });

    return this.identityRepository.save(link);
  }

  async getPlayerLinks(playerId: string): Promise<IdentityLink[]> {
    return this.identityRepository.find({ where: { playerId } });
  }

  async unlinkIdentity(playerId: string, platform: Platform): Promise<void> {
    const link = await this.identityRepository.findOne({
      where: { playerId, platform },
    });

    if (!link) {
      throw new NotFoundException(`No ${platform} link found for this player`);
    }

    await this.identityRepository.remove(link);
  }

  async getByPlatform(platform: Platform, platformId: string): Promise<IdentityLink | null> {
    return this.identityRepository.findOne({ where: { platform, platformId } });
  }
}