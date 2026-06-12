import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerPulse, PulseStatus } from '../../database/entities/player-pulse.entity';
import { PlayerFriendship, FriendStatus } from '../../database/entities/player-friendship.entity';

@Injectable()
export class PulseService {
  private readonly logger = new Logger('PulseService');
  private onlinePlayers: Map<string, string> = new Map();

  constructor(
    @InjectRepository(PlayerPulse)
    private pulseRepository: Repository<PlayerPulse>,
    @InjectRepository(PlayerFriendship)
    private friendshipRepository: Repository<PlayerFriendship>,
  ) {}

  async setPulse(
    playerId: string,
    status: PulseStatus,
    customActivity?: string,
  ): Promise<PlayerPulse> {
    let pulse = await this.pulseRepository.findOne({ where: { playerId } });

    if (!pulse) {
      pulse = this.pulseRepository.create({ playerId, status, customActivity });
    } else {
      pulse.status = status;
      pulse.customActivity = customActivity || null;
    }

    return this.pulseRepository.save(pulse);
  }

  async setOnline(playerId: string): Promise<void> {
    this.onlinePlayers.set(playerId, 'online');
    await this.setPulse(playerId, PulseStatus.ONLINE);
  }

  async setOffline(playerId: string): Promise<void> {
    this.onlinePlayers.delete(playerId);
    await this.setPulse(playerId, PulseStatus.OFFLINE);
  }

  async updateStatus(
    playerId: string,
    status: PulseStatus,
    customActivity?: string,
    hubId?: string,
  ): Promise<void> {
    this.onlinePlayers.set(playerId, status);

    let pulse = await this.pulseRepository.findOne({ where: { playerId } });
    if (pulse) {
      pulse.status = status;
      pulse.customActivity = customActivity || null;
      pulse.currentHubId = hubId || null;
      await this.pulseRepository.save(pulse);
    }
  }

  async getOnlineFriends(playerId: string): Promise<string[]> {
    const friendships = await this.friendshipRepository.find({
      where: [
        { requesterId: playerId, status: FriendStatus.ACCEPTED },
        { addresseeId: playerId, status: FriendStatus.ACCEPTED },
      ],
      relations: ['requester', 'addressee'],
    });

    const friendIds: string[] = [];
    for (const f of friendships) {
      const friendId = f.requesterId === playerId ? f.addresseeId : f.requesterId;
      if (this.onlinePlayers.has(friendId)) {
        friendIds.push(friendId);
      }
    }

    return friendIds;
  }

  getOnlinePlayerSocketIds(playerId: string): string[] {
    return [];
  }

  isPlayerOnline(playerId: string): boolean {
    return this.onlinePlayers.has(playerId);
  }

  getOnlineCount(): number {
    return this.onlinePlayers.size;
  }

  async getPlayerPulse(playerId: string): Promise<PlayerPulse | null> {
    return this.pulseRepository.findOne({ where: { playerId } });
  }
}