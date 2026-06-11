import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeploymentController } from './deployment.controller';
import { DeploymentService } from './deployment.service';
import { Server } from '../../database/entities/server.entity';
import { ServerBuild } from '../../database/entities/server-build.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Server, ServerBuild, AuditLog])],
  controllers: [DeploymentController],
  providers: [DeploymentService, AuditLogger],
})
export class DeploymentModule {}
