import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PlayersService } from './players.service';
import { KickPlayerDto, BanPlayerDto, MutePlayerDto, WarnPlayerDto, TeleportPlayerDto, MessagePlayerDto } from './players.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Players')
@Controller('players')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  @ApiOperation({ summary: 'List all players' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'serverId', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('serverId') serverId?: string,
  ) {
    return this.playersService.findAll(page, limit, search, serverId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get player by ID' })
  async findById(@Param('id') id: string) {
    return this.playersService.findById(id);
  }

  @Post(':id/kick')
  @Roles('canKickPlayer')
  @ApiOperation({ summary: 'Kick a player' })
  async kick(@Param('id') id: string, @Body() dto: KickPlayerDto, @CurrentUser() user: any) {
    return this.playersService.kickPlayer(id, dto, user.id, user.username);
  }

  @Post(':id/ban')
  @Roles('canBanPlayer')
  @ApiOperation({ summary: 'Ban a player' })
  async ban(@Param('id') id: string, @Body() dto: BanPlayerDto, @CurrentUser() user: any) {
    return this.playersService.banPlayer(id, dto, user.id, user.username);
  }

  @Post(':id/mute')
  @Roles('canMutePlayer')
  @ApiOperation({ summary: 'Mute a player' })
  async mute(@Param('id') id: string, @Body() dto: MutePlayerDto, @CurrentUser() user: any) {
    return this.playersService.mutePlayer(id, dto, user.id, user.username);
  }

  @Post(':id/warn')
  @Roles('canWarnPlayer')
  @ApiOperation({ summary: 'Warn a player' })
  async warn(@Param('id') id: string, @Body() dto: WarnPlayerDto, @CurrentUser() user: any) {
    return this.playersService.warnPlayer(id, dto, user.id, user.username);
  }

  @Post(':id/teleport')
  @Roles('canTeleportPlayer')
  @ApiOperation({ summary: 'Teleport a player' })
  async teleport(@Param('id') id: string, @Body() dto: TeleportPlayerDto, @CurrentUser() user: any) {
    return this.playersService.teleportPlayer(id, dto, user.id, user.username);
  }

  @Post(':id/message')
  @Roles('canMessagePlayer')
  @ApiOperation({ summary: 'Send a message to a player' })
  async message(@Param('id') id: string, @Body() dto: MessagePlayerDto, @CurrentUser() user: any) {
    return this.playersService.messagePlayer(id, dto, user.id, user.username);
  }
}
