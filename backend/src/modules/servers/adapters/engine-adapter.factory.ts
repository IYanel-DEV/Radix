import { Injectable } from '@nestjs/common';
import { EngineAdapter, EngineType } from './engine-adapter.interface';
import { GodotAdapter } from './godot/godot-adapter';

@Injectable()
export class EngineAdapterFactory {
  createAdapter(engineType: EngineType): EngineAdapter {
    switch (engineType) {
      case EngineType.GODOT:
        return new GodotAdapter();
      case EngineType.UNREAL:
        const { UnrealAdapter } = require('./unreal/unreal-adapter');
        return new UnrealAdapter();
      case EngineType.UNITY:
        const { UnityAdapter } = require('./unity/unity-adapter');
        return new UnityAdapter();
      default:
        throw new Error(`Unsupported engine type: ${engineType}`);
    }
  }

  getSupportedEngines(): { type: EngineType; label: string; description: string }[] {
    return [
      { type: EngineType.GODOT, label: 'Godot Engine', description: 'Godot dedicated server (executable management)' },
      { type: EngineType.UNREAL, label: 'Unreal Engine', description: 'Unreal Engine dedicated server (plugin required for advanced features)' },
      { type: EngineType.UNITY, label: 'Unity Engine', description: 'Unity dedicated server (plugin required for advanced features)' },
    ];
  }
}
