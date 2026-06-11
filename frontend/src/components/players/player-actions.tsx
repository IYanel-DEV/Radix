'use client';

import { useState } from 'react';
import { UserX, Ban, AlertTriangle, MessageSquare, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { Player } from '@/types';

interface PlayerActionsProps {
  player: Player;
}

export function PlayerActions({ player }: PlayerActionsProps) {
  const router = useRouter();
  const [confirmAction, setConfirmAction] = useState<{ type: string; open: boolean }>({ type: '', open: false });

  const executeAction = () => {
    const action = confirmAction.type;
    toast.success(`${player.username} ${action}ed`);
    setConfirmAction({ type: '', open: false });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/players/${player.id}`)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            View Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setConfirmAction({ type: 'kick', open: true })}
          >
            <UserX className="mr-2 h-4 w-4 text-amber-400" />
            Kick
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/bans?playerId=${player.id}`)}
          >
            <Ban className="mr-2 h-4 w-4 text-red-400" />
            Ban
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmAction({ type: 'mute', open: true })}
          >
            <VolumeX className="mr-2 h-4 w-4 text-blue-400" />
            Mute
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmAction({ type: 'warn', open: true })}
          >
            <AlertTriangle className="mr-2 h-4 w-4 text-amber-400" />
            Warn
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmAction.open}
        onOpenChange={(open) => setConfirmAction({ ...confirmAction, open })}
        title={`${confirmAction.type.charAt(0).toUpperCase() + confirmAction.type.slice(1)} Player`}
        description={`Are you sure you want to ${confirmAction.type} ${player.username}?`}
        variant="danger"
        confirmLabel={confirmAction.type.charAt(0).toUpperCase() + confirmAction.type.slice(1)}
        onConfirm={executeAction}
      />
    </>
  );
}
