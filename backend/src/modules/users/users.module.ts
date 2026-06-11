import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../database/entities/user.entity';
import { Session } from '../../database/entities/session.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Session, AuditLog])],
  controllers: [UsersController],
  providers: [UsersService, AuditLogger],
  exports: [UsersService],
})
export class UsersModule {}
