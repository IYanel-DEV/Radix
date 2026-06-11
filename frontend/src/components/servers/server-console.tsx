'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, Trash2, Download, Pause, Play, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useServerStore } from '@/stores/server-store';
import { sendServerCommand } from '@/lib/socket';
import { cn } from '@/lib/utils';

interface ServerConsoleProps {
  serverId: string;
  serverName: string;
  isRunning?: boolean;
}

const LOG_LEVELS = ['all', 'info', 'warning', 'error'] as const;

export function ServerConsole({ serverId, serverName, isRunning }: ServerConsoleProps) {
  const logs = useServerStore((s) => s.serverLogs[serverId] || []);
  const clearLogs = useServerStore((s) => s.clearServerLogs);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [command, setCommand] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAutoScroll = useCallback(() => {
    if (autoScroll && scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [autoScroll]);

  useEffect(() => {
    handleAutoScroll();
  }, [filteredLogs.length, handleAutoScroll]);

  const handleCommand = () => {
    if (!command.trim()) return;
    sendServerCommand(serverId, command.trim());
    setCommandHistory((prev) => [...prev, command.trim()].slice(-50));
    setHistoryIndex(-1);
    setCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  const downloadLogs = () => {
    const content = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${serverName}-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Terminal className="h-4 w-4 text-radix-400" />
            Console - {serverName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
              {LOG_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setFilterLevel(level)}
                  className={cn(
                    'px-2 py-1 text-xs rounded-md transition-colors',
                    filterLevel === level
                      ? 'bg-white/10 text-slate-200'
                      : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAutoScroll(!autoScroll)} title={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}>
              {autoScroll ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={downloadLogs} title="Download logs">
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => clearLogs(serverId)} title="Clear console">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="mt-2">
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea ref={scrollRef} className="h-[400px] bg-black/40">
          <div className="p-4 font-mono text-xs leading-relaxed">
            {!isRunning ? (
              <div className="text-slate-600 text-center py-16">
                <Terminal className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium text-slate-500">Server is offline</p>
                <p className="text-xs text-slate-600 mt-1">No log stream available</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-slate-600 text-center py-8">
                {logs.length === 0 ? 'Waiting for logs...' : 'No logs match the filter'}
              </div>
            ) : (
              filteredLogs.map((log, i) => (
                <div
                  key={i}
                  className={cn(
                    'py-0.5 flex gap-2',
                    log.level === 'error' && 'text-red-400 bg-red-500/5',
                    log.level === 'warning' && 'text-amber-400',
                    log.level === 'info' && 'text-slate-400'
                  )}
                >
                  <span className="text-slate-600 shrink-0 w-16">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="shrink-0 w-12">
                    <Badge
                      variant={
                        log.level === 'error' ? 'destructive' : log.level === 'warning' ? 'warning' : 'default'
                      }
                      className="text-[10px] px-1 py-0"
                    >
                      {log.level}
                    </Badge>
                  </span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
            <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
          </div>
        </ScrollArea>

        <div className="border-t border-white/5 p-3">
          <div className="flex gap-2">
            <div className="flex items-center text-xs text-radix-400 bg-white/5 rounded-lg px-2 font-mono">
              $
            </div>
            <Input
              ref={inputRef}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command and press Enter..."
              className="flex-1 h-9 text-sm font-mono"
            />
            <Button
              size="sm"
              onClick={handleCommand}
              disabled={!command.trim()}
              className="h-9"
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
