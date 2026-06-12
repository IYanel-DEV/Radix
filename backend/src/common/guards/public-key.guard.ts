import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { GameBaaSService } from '../../modules/game-baas/game-baas.service';

@Injectable()
export class PublicKeyGuard implements CanActivate {
  constructor(private readonly gameBaaSService: GameBaaSService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const gameToken = (request.headers['x-radix-public-key'] || request.headers['radix-public-key'] || request.headers['x-radix-game-token']) as string | undefined;

    if (!gameToken) {
      throw new UnauthorizedException('Game token is required');
    }

    if (gameToken.startsWith('radix_sec_')) {
      throw new UnauthorizedException('Invalid Client Credentials');
    }

    if (!gameToken.startsWith('radix_pub_')) {
      throw new UnauthorizedException('Invalid Client Credentials');
    }

    const apiKey = await this.gameBaaSService.findApiKeyByPublicKey(gameToken);
    if (!apiKey || !apiKey.game) {
      throw new UnauthorizedException('Invalid Client Credentials');
    }

    (request as any)['apiKey'] = apiKey;
    (request as any)['game'] = apiKey.game;
    return true;
  }
}
