import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { ServerTokenGuard } from '../../common/guards/server-token.guard';
import { PluginService } from './plugin.service';

@ApiTags('Server Plugins (S2S)')
@Controller('v1/plugin')
@UseGuards(ServerTokenGuard)
export class PluginController {
  constructor(private readonly pluginService: PluginService) {}

  @Post('metrics')
  @ApiOperation({ summary: 'Submit server metrics from game server' })
  @ApiHeader({ name: 'X-Server-Token', required: true })
  async submitMetrics(@Req() req: any, @Body() body: any) {
    return this.pluginService.submitMetrics(req.server.id, body);
  }

  @Post('players')
  @ApiOperation({ summary: 'Submit player list from game server' })
  @ApiHeader({ name: 'X-Server-Token', required: true })
  async submitPlayers(@Req() req: any, @Body() body: any) {
    return this.pluginService.submitPlayers(req.server.id, body);
  }

  @Post('log')
  @ApiOperation({ summary: 'Submit log entry from game server' })
  @ApiHeader({ name: 'X-Server-Token', required: true })
  async submitLog(@Req() req: any, @Body() body: any) {
    return this.pluginService.submitLog(req.server.id, body);
  }

  @Get('status')
  @ApiOperation({ summary: 'Health check for server-to-server communication' })
  @ApiHeader({ name: 'X-Server-Token', required: true })
  async getStatus(@Req() req: any) {
    return this.pluginService.getServerStatus(req.server.id);
  }
}
