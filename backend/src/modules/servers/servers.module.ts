import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServersController } from './servers.controller';
import { ServersService } from './servers.service';
import { ServerMetricsService } from './server-metrics.service';
import { Server } from '../../database/entities/server.entity';
import { ServerBuild } from '../../database/entities/server-build.entity';
import { ServerMetric } from '../../database/entities/server-metric.entity';
import { ServerLog } from '../../database/entities/server-log.entity';
import { ServerConfig } from '../../database/entities/server-config.entity';
import { Player } from '../../database/entities/player.entity';
import { Backup } from '../../database/entities/backup.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { AnalyticsModule } from '../analytics/analytics.module';
import { WebSocketModule } from '../../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Server, ServerBuild, ServerMetric, ServerLog,
      ServerConfig, Player, Backup, AuditLog,
    ]),
    AnalyticsModule,
    forwardRef(() => WebSocketModule),
  ],
  controllers: [ServersController],
  providers: [ServersService, ServerMetricsService, AuditLogger],
  exports: [ServersService, ServerMetricsService],
})
export class ServersModule {}
