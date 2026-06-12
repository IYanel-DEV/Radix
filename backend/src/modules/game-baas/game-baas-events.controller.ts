import { Controller, Post, Body, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GameBaaSService } from './game-baas.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SyncEventsDto } from './game-baas.dto';

@ApiTags('Game BaaS - Events')
@Controller('v1/public/events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GameBaaSEventsController {
  constructor(private readonly gameBaaSService: GameBaaSService) {}

  @Post('sync')
  @ApiOperation({ summary: 'Batch upload offline events with validation and collapse' })
  async syncEvents(
    @CurrentUser() user: any,
    @Body(ValidationPipe) body: SyncEventsDto,
  ) {
    if (!body.events || body.events.length === 0) {
      return { message: 'No events to process', total: 0, successful: 0, failed: 0, results: [] };
    }

    const results = await this.gameBaaSService.processSyncEvents(
      user.sub,
      body.events,
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      message: `Events processed: ${successful} succeeded, ${failed} failed`,
      total: body.events.length,
      successful,
      failed,
      results,
    };
  }
}