import { BaseProcessAdapter } from '../base-process.adapter';
import { EngineType } from '../engine-adapter.interface';

export class UnityAdapter extends BaseProcessAdapter {
  readonly engineType = EngineType.UNITY;

  buildStartArgs(args: string[]): string[] {
    return ['-batchmode', '-nographics', ...args];
  }

  protected getEngineMetrics() {
    return { tickRate: 60 };
  }
}
