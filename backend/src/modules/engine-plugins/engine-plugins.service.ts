import { Injectable, Logger } from '@nestjs/common';
import { EngineAdapterFactory } from '../servers/adapters/engine-adapter.factory';
import { EngineType } from '../servers/adapters/engine-adapter.interface';

@Injectable()
export class EnginePluginsService {
  private readonly logger = new Logger('EnginePluginsService');

  constructor(private readonly factory: EngineAdapterFactory) {}

  getSupportedEngines() {
    return this.factory.getSupportedEngines();
  }

  getEngineInfo(engineType: EngineType) {
    const all = this.factory.getSupportedEngines();
    const info = all.find((e) => e.type === engineType);
    if (!info) {
      throw new Error(`Engine type '${engineType}' is not supported`);
    }
    return {
      ...info,
      pluginAvailable: engineType === EngineType.GODOT,
      pluginStatus: engineType === EngineType.GODOT ? 'built-in' : 'coming-soon',
      features: this.getEngineFeatures(engineType),
    };
  }

  private getEngineFeatures(engineType: EngineType) {
    const baseFeatures = [
      'Process management (start/stop/restart/kill)',
      'Resource monitoring (CPU/RAM)',
      'Log capture',
    ];

    const advanced: Record<EngineType, string[]> = {
      [EngineType.GODOT]: [
        ...baseFeatures,
        'Godot dedicated server executable management',
        'Headless mode support',
      ],
      [EngineType.UNREAL]: [
        ...baseFeatures,
        'Unreal Engine server arguments',
        'Player count parsing from logs',
        'UE plugin for advanced features (coming soon)',
      ],
      [EngineType.UNITY]: [
        ...baseFeatures,
        'Unity batchmode support',
        'Unity plugin for advanced features (coming soon)',
      ],
    };

    return advanced[engineType] || baseFeatures;
  }

  getPluginDirectoryStructure() {
    return {
      godot: {
        path: 'modules/servers/adapters/godot/',
        files: ['godot-adapter.ts'],
        status: 'built-in',
        documentation: 'modules/servers/adapters/godot/README.md',
      },
      unreal: {
        path: 'modules/servers/adapters/unreal/',
        files: ['unreal-adapter.ts'],
        status: 'adapter-ready',
        pluginRequired: true,
        pluginApi: 'modules/servers/adapters/unreal/plugin-api.md',
        documentation: 'modules/servers/adapters/unreal/README.md',
      },
      unity: {
        path: 'modules/servers/adapters/unity/',
        files: ['unity-adapter.ts'],
        status: 'adapter-ready',
        pluginRequired: true,
        pluginApi: 'modules/servers/adapters/unity/plugin-api.md',
        documentation: 'modules/servers/adapters/unity/README.md',
      },
    };
  }
}
