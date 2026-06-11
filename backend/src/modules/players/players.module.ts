import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { Player } from '../../database/entities/player.entity';
import { Ban } from '../../database/entities/ban.entity';
import { Warning } from '../../database/entities/warning.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Player, Ban, Warning, AuditLog])],
  controllers: [PlayersController],
  providers: [PlayersService, AuditLogger],
  exports: [PlayersService],
})
export class PlayersModule {}
