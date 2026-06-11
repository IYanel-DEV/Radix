import { BaseProcessAdapter } from '../base-process.adapter';
import { EngineType } from '../engine-adapter.interface';

export class UnrealAdapter extends BaseProcessAdapter {
  readonly engineType = EngineType.UNREAL;

  buildStartArgs(args: string[]): string[] {
    return args;
  }

  protected onStdoutLine(line: string): void {
    this.parsePlayerCount(line);
  }

  protected getEngineMetrics() {
    return { tickRate: 60, fps: 60 };
  }

  private parsePlayerCount(line: string) {
    const match = line.match(/Players\s*:\s*(\d+)/i);
    if (match) {
      this.playerCount = parseInt(match[1], 10);
    }
  }
}
