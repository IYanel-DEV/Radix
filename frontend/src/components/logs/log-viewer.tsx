'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Terminal, Download, Trash2, Pause, Play, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  source?: string;
  serverId?: string;
}

interface LogViewerProps {
  logs: LogEntry[];
  title?: string;
  height?: number;
  showSource?: boolean;
}

const LOG_LEVELS = ['all', 'info', 'warning', 'error', 'debug'] as const;

export function LogViewer({ logs, title = 'Logs', height = 500, showSource = true }: LogViewerProps) {
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterLevel !== 'all' && log.level !== filterLevel) return false;
      if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [logs, filterLevel, search]);

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

  const downloadLogs = () => {
    const content = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.source ? `[${l.source}] ` : ''}${l.message}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400 bg-red-500/5';
      case 'warning': return 'text-amber-400';
      case 'debug': return 'text-blue-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Terminal className="h-4 w-4 text-radix-400" />
            {title}
            <Badge variant="outline" className="text-[10px] ml-2">
              {filteredLogs.length} entries
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg p-0.5">
              {LOG_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setFilterLevel(level)}
                  className={cn(
                    'px-2 py-1 text-[11px] rounded-md transition-colors capitalize',
                    filterLevel === level
                      ? 'bg-slate-700 text-slate-200'
                      : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAutoScroll(!autoScroll)}>
              {autoScroll ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={downloadLogs}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="mt-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea ref={scrollRef} className="font-mono text-xs leading-relaxed" style={{ height }}>
          <div className="p-4">
            {filteredLogs.length === 0 ? (
              <div className="text-slate-600 text-center py-8">No logs match the current filter</div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={cn('py-0.5 flex gap-2 hover:bg-slate-800/30 rounded px-1', getLevelColor(log.level))}
                >
                  <span className="text-slate-600 shrink-0 w-16">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="shrink-0 w-14">
                    <Badge
                      variant={
                        log.level === 'error' ? 'destructive' :
                        log.level === 'warning' ? 'warning' :
                        log.level === 'debug' ? 'default' :
                        'secondary'
                      }
                      className="text-[10px] px-1 py-0"
                    >
                      {log.level}
                    </Badge>
                  </span>
                  {showSource && log.source && (
                    <span className="text-slate-600 shrink-0">{log.source}:</span>
                  )}
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
            <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
