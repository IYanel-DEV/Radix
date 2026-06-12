import { Injectable, Logger, NotFoundException, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { ApiKey, KeyEnvironment, KeyEngine } from '../../database/entities/api-key.entity';
import { Game } from '../../database/entities/game.entity';
import { GamePlayer } from '../../database/entities/game-player.entity';
import { PlayerFriendship, FriendStatus } from '../../database/entities/player-friendship.entity';
import { PlayerEvent } from '../../database/entities/player-event.entity';
import { JwtService } from '@nestjs/jwt';
import { KeyPair, SafeKey } from './game-baas.dto';

@Injectable()
export class GameBaaSService {
  private readonly logger = new Logger('GameBaaSService');
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(GamePlayer)
    private gamePlayerRepository: Repository<GamePlayer>,
    @InjectRepository(PlayerFriendship)
    private friendshipRepository: Repository<PlayerFriendship>,
    @InjectRepository(PlayerEvent)
    private playerEventRepository: Repository<PlayerEvent>,
    private jwtService: JwtService,
  ) {}

  async getUserGame(userId: string): Promise<Game> {
    let game = await this.gameRepository.findOne({ where: { userId } });
    if (!game) {
      game = this.gameRepository.create({
        name: 'Default Game',
        userId,
      });
      await this.gameRepository.save(game);
      this.logger.log(`Auto-created default game for user ${userId}`);
    }
    return game;
  }

  async generateKeyPair(name: string, environment: KeyEnvironment, engine: KeyEngine, gameId: string): Promise<KeyPair> {
    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Game project not found');
    }

    const keyCount = await this.apiKeyRepository.count({ where: { gameId } });
    if (keyCount >= game.maxKeysAllowed) {
      throw new BadRequestException(
        `Keypair quota reached (${game.maxKeysAllowed} max). Delete existing keys or increase project limits.`,
      );
    }

    const publicKey = `radix_pub_${crypto.randomBytes(24).toString('hex')}`;
    const secretKey = `radix_sec_${crypto.randomBytes(32).toString('hex')}`;

    const publicKeyHash = await bcrypt.hash(publicKey, this.SALT_ROUNDS);
    const secretKeyHash = await bcrypt.hash(secretKey, this.SALT_ROUNDS);

    const apiKey = this.apiKeyRepository.create({
      name,
      environment,
      engine,
      gameId,
      publicKeyHash,
      secretKeyHash,
      publicKeyPrefix: 'radix_pub_',
      secretKeyPrefix: 'radix_sec_',
    });

    await this.apiKeyRepository.save(apiKey);

    this.logger.log(`New keypair created: ${name} (${apiKey.id}) [${environment}] [${engine}] for game ${gameId}`);
    return {
      id: apiKey.id,
      name: apiKey.name,
      environment: apiKey.environment,
      engine: apiKey.engine,
      publicKey,
      secretKey,
      createdAt: apiKey.createdAt,
    };
  }

  async getApiKeys(gameId: string): Promise<SafeKey[]> {
    const keys = await this.apiKeyRepository.find({
      where: { gameId },
      order: { createdAt: 'DESC' },
    });
    return keys.map((k) => this.toSafeKey(k));
  }

  async getApiKeyById(id: string, gameId: string): Promise<ApiKey | null> {
    return this.apiKeyRepository.findOne({ where: { id, gameId } });
  }

  private toSafeKey(k: ApiKey): SafeKey {
    return {
      id: k.id,
      name: k.name,
      environment: k.environment,
      engine: k.engine,
      publicKeyPrefix: k.publicKeyPrefix,
      secretKeyMasked: `${k.secretKeyPrefix}${'*'.repeat(32)}`,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    };
  }

  async deleteApiKey(id: string, gameId: string): Promise<void> {
    const result = await this.apiKeyRepository.delete({ id, gameId });
    if (result.affected === 0) {
      throw new NotFoundException('API key not found in this project');
    }
  }

  async toggleKeyStatus(id: string, isActive: boolean, gameId: string): Promise<void> {
    const key = await this.apiKeyRepository.findOne({ where: { id, gameId } });
    if (!key) {
      throw new NotFoundException('API key not found in this project');
    }
    key.isActive = isActive;
    await this.apiKeyRepository.save(key);
  }

  async validateCredentials(publicKey: string, secretKey: string, environment?: KeyEnvironment, gameId?: string): Promise<boolean> {
    const where: any = { isActive: true };
    if (environment) where.environment = environment;
    if (gameId) where.gameId = gameId;
    const keys = await this.apiKeyRepository.find({ where });
    for (const key of keys) {
      const publicMatch = await bcrypt.compare(publicKey, key.publicKeyHash);
      const secretMatch = await bcrypt.compare(secretKey, key.secretKeyHash);
      if (publicMatch && secretMatch) {
        await this.apiKeyRepository.update(key.id, { lastUsedAt: new Date() });
        return true;
      }
    }
    return false;
  }

  async validateGameToken(token: string): Promise<boolean> {
    const keys = await this.apiKeyRepository.find({ where: { isActive: true } });
    for (const key of keys) {
      if (await bcrypt.compare(token, key.secretKeyHash)) {
        await this.apiKeyRepository.update(key.id, { lastUsedAt: new Date() });
        return true;
      }
    }
    return false;
  }

  async findApiKeyByPublicKey(token: string): Promise<ApiKey | null> {
    const keys = await this.apiKeyRepository.find({
      where: { isActive: true },
      relations: ['game'],
    });
    for (const key of keys) {
      if (await bcrypt.compare(token, key.publicKeyHash)) {
        await this.apiKeyRepository.update(key.id, { lastUsedAt: new Date() });
        return key;
      }
    }
    return null;
  }

  async validatePublicKey(token: string): Promise<boolean> {
    const key = await this.findApiKeyByPublicKey(token);
    return key !== null;
  }

  async validateGameTokenWithEnv(token: string, environment?: KeyEnvironment): Promise<boolean> {
    const where: any = { isActive: true };
    if (environment) where.environment = environment;
    const keys = await this.apiKeyRepository.find({ where });
    for (const key of keys) {
      if (await bcrypt.compare(token, key.secretKeyHash)) {
        await this.apiKeyRepository.update(key.id, { lastUsedAt: new Date() });
        return true;
      }
    }
    return false;
  }

  async registerPlayer(
    username: string,
    email: string,
    password: string,
    gameId?: string,
  ): Promise<GamePlayer> {
    if (!gameId) {
      throw new BadRequestException('Game ID is required');
    }

    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Game project not found');
    }

    const existing = await this.gamePlayerRepository.findOne({
      where: [{ username, gameId }, { email, gameId }],
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
      gameId,
    });

    await this.gamePlayerRepository.save(player);
    this.logger.log(`Game player registered: ${username} (game: ${gameId})`);
    return player;
  }

  async loginPlayer(
    usernameOrEmail: string,
    password: string,
    gameId?: string,
  ): Promise<{ accessToken: string; player: Partial<GamePlayer> }> {
    if (!gameId) {
      throw new BadRequestException('Game ID is required');
    }

    const player = await this.gamePlayerRepository.findOne({
      where: [
        { username: usernameOrEmail, gameId },
        { email: usernameOrEmail, gameId },
      ],
    });

    if (!player) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, player.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: player.id, username: player.username, gameId };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.gamePlayerRepository.update(player.id, {
      isOnline: true,
      lastSeenAt: new Date(),
    });

    this.logger.log(`Game player logged in: ${player.username} (game: ${gameId})`);
    return {
      accessToken,
      player: {
        id: player.id,
        username: player.username,
        email: player.email,
        metadata: player.metadata,
        createdAt: player.createdAt,
      },
    };
  }

  async updatePlayerProfile(
    playerId: string,
    metadata: Record<string, any>,
  ): Promise<GamePlayer> {
    const player = await this.gamePlayerRepository.findOne({ where: { id: playerId } });
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    player.metadata = { ...(player.metadata || {}), ...metadata };
    await this.gamePlayerRepository.save(player);
    this.logger.log(`Player profile updated: ${player.username}`);

    const { passwordHash, ...safe } = player;
    return safe as GamePlayer;
  }

  async getPlayersByGame(
    gameId: string,
    page?: number,
    limit?: number,
  ): Promise<{ players: GamePlayer[]; meta: any }> {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

    const [players, total] = await this.gamePlayerRepository.findAndCount({
      where: { gameId },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      order: { createdAt: 'DESC' },
    });

    return {
      players,
      meta: { total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) },
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

  async processSyncEvents(
    playerId: string,
    events: { actionType: string; payload: Record<string, any>; clientTimestamp: string }[],
  ): Promise<{ index: number; success: boolean; error?: string }[]> {
    const results: { index: number; success: boolean; error?: string }[] = [];

    await this.playerEventRepository.manager.transaction(async (transactionalEntityManager) => {
      const playerRepo = transactionalEntityManager.getRepository(GamePlayer);
      const eventRepo = transactionalEntityManager.getRepository(PlayerEvent);
      const friendshipRepo = transactionalEntityManager.getRepository(PlayerFriendship);

      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        try {
          const clientDate = new Date(event.clientTimestamp);
          const now = new Date();
          const diffMs = now.getTime() - clientDate.getTime();

          if (diffMs < 0) {
            results.push({ index: i, success: false, error: 'Timestamp manipulation detected' });
            continue;
          }

          if (diffMs > 86400000 * 30) {
            results.push({ index: i, success: false, error: 'Event too old (>30 days)' });
            continue;
          }

          switch (event.actionType) {
            case 'xp_gain': {
              const amount = Number(event.payload?.amount) || 0;
              if (amount > 0 && amount <= 10000) {
                const eventRecord = eventRepo.create({
                  playerId,
                  actionType: event.actionType,
                  payload: { collapsedAmount: amount, source: event.payload?.source || 'unknown' },
                  clientTimestamp: clientDate,
                  syncStatus: 'processed',
                  processedOrder: i,
                });
                await eventRepo.save(eventRecord);
              }
              break;
            }
            case 'stat_update': {
              const updates = event.payload?.stats || {};
              const collapsedStats: Record<string, number> = {};
              let valid = true;
              for (const [key, val] of Object.entries(updates)) {
                const numVal = Number(val);
                if (isNaN(numVal) || Math.abs(numVal) > 100000) { valid = false; break; }
                collapsedStats[key] = (collapsedStats[key] || 0) + numVal;
              }
              if (valid && Object.keys(collapsedStats).length > 0) {
                const eventRecord = eventRepo.create({
                  playerId,
                  actionType: event.actionType,
                  payload: { collapsedStats, source: event.payload?.source || 'unknown' },
                  clientTimestamp: clientDate,
                  syncStatus: 'processed',
                  processedOrder: i,
                });
                await eventRepo.save(eventRecord);
              }
              break;
            }
            case 'currency_update': {
              const currencyType = event.payload?.currency || 'coins';
              const delta = Number(event.payload?.delta) || 0;
              if (Math.abs(delta) > 0 && Math.abs(delta) <= 100000) {
                const eventRecord = eventRepo.create({
                  playerId,
                  actionType: event.actionType,
                  payload: { currency: currencyType, collapsedDelta: delta },
                  clientTimestamp: clientDate,
                  syncStatus: 'processed',
                  processedOrder: i,
                });
                await eventRepo.save(eventRecord);
              }
              break;
            }
            case 'match_end': {
              const killCount = Number(event.payload?.kills) || 0;
              const deathCount = Number(event.payload?.deaths) || 0;
              if (killCount >= 0 && killCount <= 255 && deathCount >= 0 && deathCount <= 255) {
                const eventRecord = eventRepo.create({
                  playerId,
                  actionType: event.actionType,
                  payload: { kills: killCount, deaths: deathCount, matchId: event.payload?.matchId || 'unknown' },
                  clientTimestamp: clientDate,
                  syncStatus: 'processed',
                  processedOrder: i,
                });
                await eventRepo.save(eventRecord);
              }
              break;
            }
            case 'achievement_unlock': {
              const achievementId = event.payload?.achievementId;
              if (achievementId && typeof achievementId === 'string' && achievementId.length <= 100) {
                const eventRecord = eventRepo.create({
                  playerId,
                  actionType: event.actionType,
                  payload: { achievementId, name: event.payload?.name || achievementId },
                  clientTimestamp: clientDate,
                  syncStatus: 'processed',
                  processedOrder: i,
                });
                await eventRepo.save(eventRecord);
              }
              break;
            }
            case 'level_up': {
              const newLevel = Number(event.payload?.level) || 0;
              if (newLevel > 0 && newLevel <= 9999) {
                const eventRecord = eventRepo.create({
                  playerId,
                  actionType: event.actionType,
                  payload: { level: newLevel, previousLevel: event.payload?.previousLevel || 0 },
                  clientTimestamp: clientDate,
                  syncStatus: 'processed',
                  processedOrder: i,
                });
                await eventRepo.save(eventRecord);
              }
              break;
            }
            default: {
              const eventRecord = eventRepo.create({
                playerId,
                actionType: event.actionType,
                payload: event.payload || {},
                clientTimestamp: clientDate,
                syncStatus: 'processed',
                processedOrder: i,
              });
              await eventRepo.save(eventRecord);
              break;
            }
          }
          results.push({ index: i, success: true });
        } catch (err: any) {
          results.push({ index: i, success: false, error: err.message || 'Processing failed' });
        }
      }
    });

    return results;
  }
}