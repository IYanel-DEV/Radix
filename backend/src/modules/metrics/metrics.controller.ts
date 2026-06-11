import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Metrics')
@Controller('metrics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard metrics overview' })
  async getDashboard() {
    return this.metricsService.getDashboard();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get metrics for a specific server' })
  @ApiQuery({ name: 'hours', required: false })
  async getServerMetrics(@Param('id') id: string, @Query('hours') hours?: number) {
    return this.metricsService.getServerMetrics(id, hours);
  }
}
