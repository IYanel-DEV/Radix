import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { SystemMetricsService } from './system-metrics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [SystemMetricsService],
  exports: [SystemMetricsService],
})
export class AnalyticsModule {}
