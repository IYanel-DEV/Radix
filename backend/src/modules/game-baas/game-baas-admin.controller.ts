import { Controller, Get, Post, Delete, Put, Body, Param, UseGuards, ValidationPipe, Inject, forwardRef, NotFoundException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GameBaaSService } from './game-baas.service';
import { PulseService } from './pulse.service';
import { PlayerGateway } from './player.gateway';
import { GenerateKeypairDto, ToggleKeyStatusDto } from './game-baas.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Game BaaS - Admin')
@Controller('game-baas/keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GameBaaSAdminController {
  constructor(
    private readonly gameBaaSService: GameBaaSService,
    private readonly pulseService: PulseService,
    @Inject(forwardRef(() => PlayerGateway))
    private readonly playerGateway: PlayerGateway,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new keypair (Public + Secret Key) with environment' })
  async generateKeypair(
    @Body(ValidationPipe) body: GenerateKeypairDto,
    @CurrentUser() user: any,
  ) {
    const game = await this.gameBaaSService.getUserGame(user.id);
    const result = await this.gameBaaSService.generateKeyPair(body.name, body.environment, body.engine, game.id);
    return {
      message: 'Keypair generated successfully. Save these credentials - the secret key will not be shown again.',
      id: result.id,
      name: result.name,
      environment: result.environment,
      engine: result.engine,
      publicKey: result.publicKey,
      secretKey: result.secretKey,
      createdAt: result.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all keypairs (secret keys masked)' })
  async getKeys(@CurrentUser() user: any) {
    const game = await this.gameBaaSService.getUserGame(user.id);
    const keys = await this.gameBaaSService.getApiKeys(game.id);
    return { keys };
  }

  @Put(':id/toggle')
  @ApiOperation({ summary: 'Enable or disable a keypair (revokes active WS on disable)' })
  async toggleKeyStatus(
    @Param('id') id: string,
    @Body(ValidationPipe) body: ToggleKeyStatusDto,
    @CurrentUser() user: any,
  ) {
    const game = await this.gameBaaSService.getUserGame(user.id);
    const wasActive = await this.gameBaaSService.getApiKeyById(id, game.id).then(k => k?.isActive);
    await this.gameBaaSService.toggleKeyStatus(id, body.isActive, game.id);
    if (wasActive && !body.isActive) {
      const disconnected = this.playerGateway.disconnectByKeyId(id);
      return { message: `Keypair disabled. ${disconnected} active connection(s) terminated.` };
    }
    return { message: `Keypair ${body.isActive ? 'enabled' : 'disabled'} successfully` };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a keypair (revokes all active WS connections)' })
  async deleteKey(@Param('id') id: string, @CurrentUser() user: any) {
    const game = await this.gameBaaSService.getUserGame(user.id);
    const disconnected = this.playerGateway.disconnectByKeyId(id);
    await this.gameBaaSService.deleteApiKey(id, game.id);
    return { message: `Keypair deleted. ${disconnected} active connection(s) terminated.` };
  }
}

@ApiTags('Game BaaS - Admin')
@Controller('game-baas/players')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GameBaaSPlayerAdminController {
  constructor(
    private readonly gameBaaSService: GameBaaSService,
    private readonly pulseService: PulseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all players for the authenticated user\'s game' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getPlayers(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const game = await this.gameBaaSService.getUserGame(user.id);
    const result = await this.gameBaaSService.getPlayersByGame(game.id, page, limit);
    return {
      players: result.players,
      meta: result.meta,
    };
  }

  @Get(':gameId')
  @ApiOperation({ summary: 'List all players for a specific game (requires ownership)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getPlayersByGame(
    @Param('gameId') gameId: string,
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const game = await this.gameBaaSService.getUserGame(user.id);
    if (game.id !== gameId) {
      throw new NotFoundException('Game project not found');
    }
    const result = await this.gameBaaSService.getPlayersByGame(game.id, page, limit);
    return {
      players: result.players,
      meta: result.meta,
    };
  }

  @Get(':id/pulse')
  @ApiOperation({ summary: 'Get pulse status for a player' })
  async getPlayerPulse(@Param('id') id: string) {
    const pulse = await this.pulseService.getPlayerPulse(id);
    return { pulse: pulse ? { status: pulse.status, customActivity: pulse.customActivity, currentHubId: pulse.currentHubId, updatedAt: pulse.updatedAt } : null };
  }
}