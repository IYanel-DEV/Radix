import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameBuildsController } from './game-builds.controller';
import { GameBuildsService } from './game-builds.service';
import { ServerBuild } from '../../database/entities/server-build.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServerBuild])],
  controllers: [GameBuildsController],
  providers: [GameBuildsService],
  exports: [GameBuildsService],
})
export class GameBuildsModule {}
