import { Controller, Post, Get, Body, Param, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { GameBaaSService } from './game-baas.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Game BaaS - Public')
@Controller('api/v1/public')
export class GameBaaSPublicController {
  constructor(private readonly gameBaaSService: GameBaaSService) {}

  @Post('auth/register')
  @Public()
  @ApiOperation({ summary: 'Register a new game player' })
  @ApiHeader({ name: 'x-radix-game-token', required: true, description: 'Game API token' })
  async register(
    @Headers('x-radix-game-token') gameToken: string,
    @Body() body: { username: string; email: string; password: string },
  ) {
    if (!gameToken) {
      throw new UnauthorizedException('Game token is required');
    }
    const player = await this.gameBaaSService.registerPlayer(
      gameToken,
      body.username,
      body.email,
      body.password,
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
  @ApiHeader({ name: 'x-radix-game-token', required: true, description: 'Game API token' })
  async login(
    @Headers('x-radix-game-token') gameToken: string,
    @Body() body: { username: string; password: string },
  ) {
    if (!gameToken) {
      throw new UnauthorizedException('Game token is required');
    }
    const result = await this.gameBaaSService.loginPlayer(
      gameToken,
      body.username,
      body.password,
    );
    return {
      accessToken: result.accessToken,
      player: result.player,
    };
  }
}