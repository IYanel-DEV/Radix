import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GameBaaSService } from './game-baas.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Game BaaS - Players')
@Controller('api/v1/public/players')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GameBaaSPlayersController {
  constructor(private readonly gameBaaSService: GameBaaSService) {}

  @Post('friends')
  @ApiOperation({ summary: 'Send a friend request' })
  async addFriend(
    @CurrentUser() user: any,
    @Body() body: { username: string },
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
    @Body() body: { accept: boolean },
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
}