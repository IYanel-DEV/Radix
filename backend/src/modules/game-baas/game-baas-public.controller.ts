import { Controller, Post, Get, Body, UnauthorizedException, UseGuards, ValidationPipe, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { GameBaaSService } from './game-baas.service';
import { RegisterPlayerDto, LoginPlayerDto } from './game-baas.dto';
import { Public } from '../../common/decorators/public.decorator';
import { PublicKeyGuard } from '../../common/guards/public-key.guard';
import { Game } from '../../database/entities/game.entity';

@ApiTags('Game BaaS - Public')
@UseGuards(PublicKeyGuard)
@Controller('v1/public')
export class GameBaaSPublicController {
  constructor(private readonly gameBaaSService: GameBaaSService) {}

  @Get('ping')
  @Public()
  @ApiOperation({ summary: 'Lightweight health-check for network diagnostics' })
  ping() {
    return { status: 'online', timestamp: new Date().toISOString() };
  }

  @Post('auth/register')
  @Public()
  @ApiOperation({ summary: 'Register a new game player' })
  @ApiHeader({ name: 'Radix-Public-Key', required: true, description: 'Game public key (x-radix-public-key also accepted)' })
  async register(
    @Req() req: Request,
    @Body(ValidationPipe) body: RegisterPlayerDto,
  ) {
    const game: Game = (req as any)['game'];
    if (!game) {
      throw new UnauthorizedException('Invalid Client Credentials');
    }

    const player = await this.gameBaaSService.registerPlayer(
      body.username,
      body.email,
      body.password,
      game.id,
    );
    return {
      message: 'Player registered successfully',
      playerId: player.id,
      username: player.username,
    };
  }

  @Post('auth/login')
  @Public()
  @ApiOperation({ summary: 'Login a game player' })
  @ApiHeader({ name: 'Radix-Public-Key', required: true, description: 'Game public key (x-radix-public-key also accepted)' })
  async login(
    @Req() req: Request,
    @Body(ValidationPipe) body: LoginPlayerDto,
  ) {
    const game: Game = (req as any)['game'];
    if (!game) {
      throw new UnauthorizedException('Invalid Client Credentials');
    }

    const result = await this.gameBaaSService.loginPlayer(
      body.username,
      body.password,
      game.id,
    );
    return {
      accessToken: result.accessToken,
      player: result.player,
    };
  }
}
