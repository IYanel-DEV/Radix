import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { ServerBuild } from '../../database/entities/server-build.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServerBuild, AuditLog]),
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE ?? '', 10) || 524288000,
      },
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService, AuditLogger],
  exports: [UploadsService],
})
export class UploadsModule {}
