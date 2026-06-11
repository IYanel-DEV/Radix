import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../../database/entities/user.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { Server } from '../../database/entities/server.entity';
import { Role } from '../../database/entities/role.entity';
import { Permission } from '../../database/entities/permission.entity';
import { AuditLogger } from '../../common/utils/audit-logger';

@Module({
  imports: [TypeOrmModule.forFeature([User, AuditLog, Server, Role, Permission])],
  controllers: [AdminController],
  providers: [AdminService, AuditLogger],
})
export class AdminModule {}
