import { Injectable, Logger, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ApiKey } from '../../database/entities/api-key.entity';
import { GamePlayer } from '../../database/entities/game-player.entity';
import { PlayerFriendship, FriendStatus } from '../../database/entities/player-friendship.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class GameBaaSService {
  private readonly logger = new Logger('GameBaaSService');
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(GamePlayer)
    private gamePlayerRepository: Repository<GamePlayer>,
    @InjectRepository(PlayerFriendship)
    private friendshipRepository: Repository<PlayerFriendship>,
    private jwtService: JwtService,
  ) {}

  async generateApiKey(name: string): Promise<{ id: string; name: string; token: string; createdAt: Date }> {
    const token = `radix_pub_${crypto.randomBytes(24).toString('hex')}`;
    const tokenHash = await bcrypt.hash(token, this.SALT_ROUNDS);

    const apiKey = this.apiKeyRepository.create({
      name,
      tokenHash,
      tokenPrefix: 'radix_pub_',
    });

    await this.apiKeyRepository.save(apiKey);

    this.logger.log(`New API key created: ${name}`);
    return {
      id: apiKey.id,
      name: apiKey.name,
      token,
      createdAt: apiKey.createdAt,
    };
  }

  async getApiKeys(): Promise<Partial<ApiKey>[]> {
    const keys = await this.apiKeyRepository.find({
      order: { createdAt: 'DESC' },
    });
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      tokenPrefix: k.tokenPrefix,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    }));
  }

  async deleteApiKey(id: string): Promise<void> {
    const result = await this.apiKeyRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('API key not found');
    }
  }

  async validateGameToken(token: string): Promise<boolean> {
    const keys = await this.apiKeyRepository.find({ where: { isActive: true } });
    for (const key of keys) {
      if (await bcrypt.compare(token, key.tokenHash)) {
        await this.apiKeyRepository.update(key.id, { lastUsedAt: new Date() });
        return true;
      }
    }
    return false;
  }

  async registerPlayer(
    gameToken: string,
    username: string,
    email: string,
    password: string,
  ): Promise<GamePlayer> {
    if (!(await this.validateGameToken(gameToken))) {
      throw new UnauthorizedException('Invalid game token');
    }

    const existing = await this.gamePlayerRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existing) {
      if (existing.username === username) {
        throw new ConflictException('Username already taken');
      }
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    const player = this.gamePlayerRepository.create({
      username,
      email,
      passwordHash,
    });

    await this.gamePlayerRepository.save(player);
    this.logger.log(`Game player registered: ${username}`);
    return player;
  }

  async loginPlayer(
    gameToken: string,
    usernameOrEmail: string,
    password: string,
  ): Promise<{ accessToken: string; player: Partial<GamePlayer> }> {
    if (!(await this.validateGameToken(gameToken))) {
      throw new UnauthorizedException('Invalid game token');
    }

    const player = await this.gamePlayerRepository.findOne({
      where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!player) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, player.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: player.id, username: player.username };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.gamePlayerRepository.update(player.id, {
      isOnline: true,
      lastSeenAt: new Date(),
    });

    this.logger.log(`Game player logged in: ${player.username}`);
    return {
      accessToken,
      player: {
        id: player.id,
        username: player.username,
        email: player.email,
        createdAt: player.createdAt,
      },
    };
  }

  async addFriend(requesterId: string, addresseeUsername: string): Promise<PlayerFriendship> {
    const addressee = await this.gamePlayerRepository.findOne({
      where: { username: addresseeUsername },
    });

    if (!addressee) {
      throw new NotFoundException('Player not found');
    }

    if (requesterId === addressee.id) {
      throw new ConflictException('Cannot add yourself as friend');
    }

    const existing = await this.friendshipRepository.findOne({
      where: [
        { requesterId, addresseeId: addressee.id },
        { requesterId: addressee.id, addresseeId: requesterId },
      ],
    });

    if (existing) {
      if (existing.status === FriendStatus.ACCEPTED) {
        throw new ConflictException('Already friends');
      }
      if (existing.status === FriendStatus.PENDING) {
        if (existing.requesterId === requesterId) {
          throw new ConflictException('Friend request already sent');
        }
        existing.status = FriendStatus.ACCEPTED;
        return this.friendshipRepository.save(existing);
      }
    }

    const friendship = this.friendshipRepository.create({
      requesterId,
      addresseeId: addressee.id,
      status: FriendStatus.PENDING,
    });

    return this.friendshipRepository.save(friendship);
  }

  async getFriends(playerId: string): Promise<PlayerFriendship[]> {
    return this.friendshipRepository.find({
      where: [
        { requesterId: playerId, status: FriendStatus.ACCEPTED },
        { addresseeId: playerId, status: FriendStatus.ACCEPTED },
      ],
      relations: ['requester', 'addressee'],
    });
  }

  async getPendingRequests(playerId: string): Promise<PlayerFriendship[]> {
    return this.friendshipRepository.find({
      where: { addresseeId: playerId, status: FriendStatus.PENDING },
      relations: ['requester'],
    });
  }

  async respondToFriendRequest(
    friendshipId: string,
    responderId: string,
    accept: boolean,
  ): Promise<PlayerFriendship> {
    const friendship = await this.friendshipRepository.findOne({
      where: { id: friendshipId, addresseeId: responderId, status: FriendStatus.PENDING },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    if (accept) {
      friendship.status = FriendStatus.ACCEPTED;
    } else {
      friendship.status = FriendStatus.BLOCKED;
    }

    return this.friendshipRepository.save(friendship);
  }

  async setPlayerOnline(playerId: string, isOnline: boolean): Promise<void> {
    await this.gamePlayerRepository.update(playerId, {
      isOnline,
      lastSeenAt: isOnline ? undefined : new Date(),
    });
  }
}