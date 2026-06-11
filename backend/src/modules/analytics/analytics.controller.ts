import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemMetricsService } from './system-metrics.service';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class AnalyticsController {
  constructor(private readonly systemMetrics: SystemMetricsService) {}

  @Get('system')
  @Roles('canViewMetrics')
  @ApiOperation({ summary: 'Get real system metrics (CPU, RAM, Disk, Network)' })
  async getSystemMetrics() {
    return this.systemMetrics.collectSystemMetrics();
  }
}
