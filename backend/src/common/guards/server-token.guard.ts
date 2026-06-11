import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Server } from '../../database/entities/server.entity';

@Injectable()
export class ServerTokenGuard implements CanActivate {
  private readonly logger = new Logger('ServerTokenGuard');
  private readonly cache = new Map<string, { id: string; name: string; engineType: string }>();
  private readonly rateLimitMap = new Map<string, { count: number; windowStart: number }>();
  private readonly CACHE_TTL = 300_000;
  private readonly RATE_LIMIT_MAX = 60;
  private readonly RATE_LIMIT_WINDOW = 60_000;

  constructor(
    @InjectRepository(Server)
    private serverRepository: Repository<Server>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-server-token'];

    if (!token || typeof token !== 'string') {
      this.logAuthFailure(null, request.ip, 'Missing X-Server-Token header');
      throw new UnauthorizedException('Missing X-Server-Token header');
    }

    const hash = crypto.createHash('sha256').update(token).digest('hex');

    let serverInfo = this.cache.get(hash);
    if (!serverInfo) {
      const server = await this.serverRepository.findOne({
        where: { serverTokenHash: hash },
      });

      if (!server) {
        this.logAuthFailure(hash, request.ip, 'Invalid server token');
        throw new UnauthorizedException('Invalid server token');
      }

      serverInfo = { id: server.id, name: server.name, engineType: server.engineType };
      this.cache.set(hash, serverInfo);
      setTimeout(() => this.cache.delete(hash), this.CACHE_TTL);
    }

    const now = Date.now();
    const rateEntry = this.rateLimitMap.get(serverInfo.id);
    if (rateEntry && (now - rateEntry.windowStart) < this.RATE_LIMIT_WINDOW) {
      rateEntry.count++;
      if (rateEntry.count > this.RATE_LIMIT_MAX) {
        this.logger.warn(`S2S rate limit exceeded for server ${serverInfo.id}`);
        throw new UnauthorizedException('Rate limit exceeded for server token');
      }
    } else {
      this.rateLimitMap.set(serverInfo.id, { count: 1, windowStart: now });
    }

    await this.serverRepository.update(serverInfo.id, {
      lastS2sAt: new Date() as any,
      lastS2sIp: request.ip || request.connection?.remoteAddress || '',
    });

    request.server = serverInfo;
    return true;
  }

  private logAuthFailure(hash: string | null, ip: string, reason: string) {
    this.logger.warn(`S2S auth failure - hash:${hash?.substring(0, 12) || 'none'} ip:${ip} reason:${reason}`);
  }
}
