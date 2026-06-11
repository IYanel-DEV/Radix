import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PluginController } from './plugin.controller';
import { PluginService } from './plugin.service';
import { Server } from '../../database/entities/server.entity';
import { ServerMetric } from '../../database/entities/server-metric.entity';
import { ServerLog } from '../../database/entities/server-log.entity';
import { Player } from '../../database/entities/player.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Server, ServerMetric, ServerLog, Player]),
  ],
  controllers: [PluginController],
  providers: [PluginService],
})
export class PluginModule {}
