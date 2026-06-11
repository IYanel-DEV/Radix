import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BansController } from './bans.controller';
import { BansService } from './bans.service';
import { Ban } from '../../database/entities/ban.entity';
import { Player } from '../../database/entities/player.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ban, Player, AuditLog])],
  controllers: [BansController],
  providers: [BansService, AuditLogger],
  exports: [BansService],
})
export class BansModule {}
