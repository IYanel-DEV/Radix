import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GameBaaSService } from './game-baas.service';
import { IdentityLinksService } from './identity-links.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Platform } from '../../database/entities/identity-link.entity';
import { AddFriendDto, RespondFriendDto, LinkIdentityDto, UpdatePlayerProfileDto } from './game-baas.dto';

@ApiTags('Game BaaS - Players')
@Controller('v1/public/players')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GameBaaSPlayersController {
  constructor(
    private readonly gameBaaSService: GameBaaSService,
    private readonly identityService: IdentityLinksService,
  ) {}

  @Put('profile')
  @ApiOperation({ summary: 'Update player profile metadata (level, rank, stats, etc.)' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body(ValidationPipe) body: UpdatePlayerProfileDto,
  ) {
    const player = await this.gameBaaSService.updatePlayerProfile(user.sub, body.metadata);
    return {
      player: {
        id: player.id,
        username: player.username,
        email: player.email,
        metadata: player.metadata,
        createdAt: player.createdAt,
      },
      message: 'Profile updated successfully',
    };
  }

  @Post('friends')
  @ApiOperation({ summary: 'Send a friend request' })
  async addFriend(
    @CurrentUser() user: any,
    @Body(ValidationPipe) body: AddFriendDto,
  ) {
    const friendship = await this.gameBaaSService.addFriend(user.sub, body.username);
    return {
      friendshipId: friendship.id,
      status: friendship.status,
      message: 'Friend request sent',
    };
  }

  @Get('friends')
  @ApiOperation({ summary: 'Get all accepted friends' })
  async getFriends(@CurrentUser() user: any) {
    const friendships = await this.gameBaaSService.getFriends(user.sub);
    return {
      friends: friendships.map((f) => ({
        id: f.id,
        friend: {
          id: f.requesterId === user.sub ? f.addressee.id : f.requester.id,
          username: f.requesterId === user.sub ? f.addressee.username : f.requester.username,
        },
        status: f.status,
        createdAt: f.createdAt,
      })),
    };
  }

  @Get('friends/pending')
  @ApiOperation({ summary: 'Get pending friend requests' })
  async getPendingRequests(@CurrentUser() user: any) {
    const requests = await this.gameBaaSService.getPendingRequests(user.sub);
    return {
      requests: requests.map((r) => ({
        id: r.id,
        from: {
          id: r.requester.id,
          username: r.requester.username,
        },
        createdAt: r.createdAt,
      })),
    };
  }

  @Post('friends/:friendshipId/respond')
  @ApiOperation({ summary: 'Accept or decline a friend request' })
  async respondToRequest(
    @CurrentUser() user: any,
    @Param('friendshipId') friendshipId: string,
    @Body(ValidationPipe) body: RespondFriendDto,
  ) {
    const friendship = await this.gameBaaSService.respondToFriendRequest(
      friendshipId,
      user.sub,
      body.accept,
    );
    return {
      friendshipId: friendship.id,
      status: friendship.status,
      message: body.accept ? 'Friend request accepted' : 'Friend request declined',
    };
  }

  @Post('identities/link')
  @ApiOperation({ summary: 'Link a platform identity to current player' })
  async linkIdentity(
    @CurrentUser() user: any,
    @Body(ValidationPipe) body: LinkIdentityDto,
  ) {
    const link = await this.identityService.linkIdentity(
      user.sub,
      body.platform as Platform,
      body.platformId,
    );
    return {
      id: link.id,
      platform: link.platform,
      platformId: link.platformId,
      linkedAt: link.linkedAt,
      message: `${body.platform} account linked successfully`,
    };
  }

  @Get('identities')
  @ApiOperation({ summary: 'Get all identity links for current player' })
  async getIdentities(@CurrentUser() user: any) {
    const links = await this.identityService.getPlayerLinks(user.sub);
    return {
      identities: links.map((l) => ({
        id: l.id,
        platform: l.platform,
        platformId: l.platformId,
        linkedAt: l.linkedAt,
      })),
    };
  }

  @Delete('identities/:platform')
  @ApiOperation({ summary: 'Unlink a platform identity' })
  async unlinkIdentity(
    @CurrentUser() user: any,
    @Param('platform') platform: Platform,
  ) {
    await this.identityService.unlinkIdentity(user.sub, platform);
    return { message: `${platform} account unlinked successfully` };
  }
}