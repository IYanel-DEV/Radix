'use client';

import { useState } from 'react';
import { Play, Square, RotateCcw, Trash2, MoreHorizontal, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useServerStore } from '@/stores/server-store';
import type { Server, ServerStatus } from '@/types';
import toast from 'react-hot-toast';

interface ServerActionsProps {
  server: Server;
  size?: 'sm' | 'default' | 'icon';
  showLabel?: boolean;
}

export function ServerActions({ server, size = 'sm', showLabel = false }: ServerActionsProps) {
  const { startServer, stopServer, restartServer, killServer, deleteServer } = useServerStore();
  const [confirmAction, setConfirmAction] = useState<{ type: string; open: boolean }>({ type: '', open: false });

  const handleAction = async (action: string) => {
    try {
      switch (action) {
        case 'start':
          await startServer(server.id);
          toast.success('Server starting...');
          break;
        case 'stop':
          await stopServer(server.id);
          toast.success('Server stopping...');
          break;
        case 'restart':
          await restartServer(server.id);
          toast.success('Server restarting...');
          break;
        case 'delete':
          await deleteServer(server.id);
          toast.success('Server deleted');
          break;
      }
    } catch (error: any) {
      toast.error(error?.message || 'Action failed');
    }
    setConfirmAction({ type: '', open: false });
  };

  const confirmLabels: Record<string, { title: string; description: string; variant: 'default' | 'danger' }> = {
    stop: {
      title: 'Stop Server',
      description: `Are you sure you want to stop "${server.name}"? All connected players will be disconnected.`,
      variant: 'danger',
    },
    restart: {
      title: 'Restart Server',
      description: `Are you sure you want to restart "${server.name}"? Players will be temporarily disconnected.`,
      variant: 'danger',
    },
    kill: {
      title: 'Force Kill Server',
      description: `Forcefully kill "${server.name}"? Process will be SIGKILL'd immediately. Players will lose connection and unsaved data may be lost.`,
      variant: 'danger',
    },
    delete: {
      title: 'Delete Server',
      description: `Are you sure you want to permanently delete "${server.name}"? This action cannot be undone.`,
      variant: 'danger',
    },
  };

  const isRunning = server.status === 'running';
  const isStopped = server.status === 'stopped';
  const isBusy = ['starting', 'stopping', 'updating'].includes(server.status);

  return (
    <>
      <div className="flex items-center gap-1">
        {isStopped && (
          <Button
            variant="outline"
            size={size}
            onClick={() => handleAction('start')}
            disabled={isBusy}
            title="Start Server"
            className="text-radix-400 border-radix-500/20 hover:bg-radix-500/10"
          >
            <Play className="h-4 w-4" />
            {showLabel && <span className="ml-1">Start</span>}
          </Button>
        )}
        {isRunning && (
          <>
            <Button
              variant="outline"
              size={size}
              onClick={() => setConfirmAction({ type: 'stop', open: true })}
              disabled={isBusy}
              title="Stop Server"
              className="text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
            >
              <Square className="h-4 w-4" />
              {showLabel && <span className="ml-1">Stop</span>}
            </Button>
            <Button
              variant="outline"
              size={size}
              onClick={() => setConfirmAction({ type: 'restart', open: true })}
              disabled={isBusy}
              title="Restart Server"
              className="text-blue-400 border-blue-500/20 hover:bg-blue-500/10"
            >
              <RotateCcw className="h-4 w-4" />
              {showLabel && <span className="ml-1">Restart</span>}
            </Button>
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isStopped && (
              <DropdownMenuItem onClick={() => handleAction('start')}>
                <Play className="mr-2 h-4 w-4 text-radix-400" />
                Start
              </DropdownMenuItem>
            )}
            {isRunning && (
              <>
                <DropdownMenuItem onClick={() => setConfirmAction({ type: 'stop', open: true })}>
                  <Square className="mr-2 h-4 w-4 text-amber-400" />
                  Stop
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmAction({ type: 'restart', open: true })}>
                  <RotateCcw className="mr-2 h-4 w-4 text-blue-400" />
                  Restart
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => setConfirmAction({ type: 'kill', open: true })}>
              <Swords className="mr-2 h-4 w-4 text-red-400" />
              <span className="text-red-400">Force Kill</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setConfirmAction({ type: 'delete', open: true })}
              className="text-red-400 focus:text-red-400"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={confirmAction.open}
        onOpenChange={(open) => setConfirmAction({ ...confirmAction, open })}
        title={confirmLabels[confirmAction.type]?.title || ''}
        description={confirmLabels[confirmAction.type]?.description || ''}
        variant={confirmLabels[confirmAction.type]?.variant || 'danger'}
        confirmLabel={confirmAction.type === 'delete' ? 'Delete' : 'Confirm'}
        onConfirm={() => handleAction(confirmAction.type)}
      />
    </>
  );
}
