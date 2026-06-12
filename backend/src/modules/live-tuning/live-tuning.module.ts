import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveTuningController } from './live-tuning.controller';
import { LiveTuningService } from './live-tuning.service';
import { LiveTuning } from '../../database/entities/live-tuning.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LiveTuning])],
  controllers: [LiveTuningController],
  providers: [LiveTuningService],
  exports: [LiveTuningService],
})
export class LiveTuningModule {}