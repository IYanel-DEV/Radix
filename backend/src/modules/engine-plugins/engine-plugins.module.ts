import { Module, Global } from '@nestjs/common';
import { EngineAdapterFactory } from '../servers/adapters/engine-adapter.factory';
import { EnginePluginsController } from './engine-plugins.controller';
import { EnginePluginsService } from './engine-plugins.service';

@Global()
@Module({
  controllers: [EnginePluginsController],
  providers: [EngineAdapterFactory, EnginePluginsService],
  exports: [EngineAdapterFactory, EnginePluginsService],
})
export class EnginePluginsModule {}
