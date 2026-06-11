import { BaseProcessAdapter } from '../base-process.adapter';
import { EngineType } from '../engine-adapter.interface';
import * as fs from 'fs';
import * as path from 'path';

export class GodotAdapter extends BaseProcessAdapter {
  readonly engineType = EngineType.GODOT;

  protected getStartupTimeout(): number {
    return 2000;
  }

  buildStartArgs(args: string[]): string[] {
    return ['--headless', '--server', ...args];
  }

  startServer(executablePath: string, serverDirectory: string, args: string[]): Promise<any> {
    const pckPath = this.findPckFile(serverDirectory);
    if (pckPath) {
      const pckArg = `--main-pack=${pckPath}`;
      if (!args.includes(pckArg)) {
        args = [...args, pckArg];
      }
    }
    return super.startServer(executablePath, serverDirectory, args);
  }

  private findPckFile(dir: string): string | null {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.pck')) {
        return path.join(dir, entry.name);
      }
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const found = this.findPckFile(path.join(dir, entry.name));
        if (found) return found;
      }
    }
    return null;
  }
}
