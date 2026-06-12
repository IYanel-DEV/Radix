import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface QueuedEvent {
  actionType: string;
  payload: any;
  clientTimestamp: string;
}

@ApiTags('Game BaaS - Events')
@Controller('api/v1/public/events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GameBaaSEventsController {
  @Post('sync')
  @ApiOperation({ summary: 'Batch upload offline events' })
  async syncEvents(
    @CurrentUser() user: any,
    @Body() body: { events: QueuedEvent[] },
  ) {
    const results: { index: number; success: boolean; error?: string }[] = [];

    for (let i = 0; i < body.events.length; i++) {
      const event = body.events[i];
      try {
        await this.processEvent(user.sub, event, i);
        results.push({ index: i, success: true });
      } catch (err: any) {
        results.push({ index: i, success: false, error: err.message });
      }
    }

    return {
      message: 'Events processed',
      total: body.events.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  private async processEvent(playerId: string, event: QueuedEvent, order: number): Promise<void> {
    switch (event.actionType) {
      case 'match_end':
      case 'match_start':
      case 'stat_update':
      case 'achievement_unlock':
      case 'level_up':
        return;
      default:
        throw new Error(`Unknown event type: ${event.actionType}`);
    }
  }
}