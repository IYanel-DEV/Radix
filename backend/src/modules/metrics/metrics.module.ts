import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { Server } from '../../database/entities/server.entity';
import { ServerMetric } from '../../database/entities/server-metric.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Server, ServerMetric]),
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
