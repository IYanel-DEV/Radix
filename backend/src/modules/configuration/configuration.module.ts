import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigurationController } from './configuration.controller';
import { ConfigurationService } from './configuration.service';
import { ServerConfig } from '../../database/entities/server-config.entity';
import { Server } from '../../database/entities/server.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServerConfig, Server, AuditLog])],
  controllers: [ConfigurationController],
  providers: [ConfigurationService, AuditLogger],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
