'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, UserX } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchInput } from '@/components/ui/search-input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import toast from 'react-hot-toast';
import type { Server, Player } from '@/types';

interface ServerPlayersProps {
  server: Server;
}

export function ServerPlayers({ server }: ServerPlayersProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; open: boolean }>({ type: '', open: false });

  const players = (server.players || []).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.username.toLowerCase().includes(q) || p.playerId.includes(q);
  });

  const handleKick = (player: Player) => {
    setSelectedPlayer(player);
    setConfirmAction({ type: 'kick', open: true });
  };

  const handleBan = (player: Player) => {
    setSelectedPlayer(player);
    setConfirmAction({ type: 'ban', open: true });
  };

  const executeAction = () => {
    if (!selectedPlayer) return;
    if (confirmAction.type === 'kick') {
      toast.success(`${selectedPlayer.username} kicked`);
    } else if (confirmAction.type === 'ban') {
      toast.success(`${selectedPlayer.username} banned`);
    }
    setConfirmAction({ type: '', open: false });
    setSelectedPlayer(null);
  };

  const columns = [
    {
      key: 'username',
      header: 'Player',
      render: (p: Player) => (
        <span
          className="text-slate-200 font-medium cursor-pointer hover:text-emerald-400"
          onClick={() => router.push(`/players/${p.id}`)}
        >
          {p.username}
        </span>
      ),
    },
    {
      key: 'playerId',
      header: 'Player ID',
      render: (p: Player) => (
        <span className="text-slate-500 text-xs font-mono">{p.playerId}</span>
      ),
    },
    { key: 'totalKills', header: 'Kills' },
    { key: 'totalDeaths', header: 'Deaths' },
    {
      key: 'actions',
      header: 'Actions',
      render: (p: Player) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            onClick={() => handleKick(p)}
            title="Kick"
          >
            <UserX className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => handleBan(p)}
            title="Ban"
          >
            <Ban className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Connected Players ({players.length})</span>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search players..."
              className="w-64"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={players}
            keyExtractor={(p) => p.id}
            emptyMessage="No players connected"
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmAction.open}
        onOpenChange={(open) => setConfirmAction({ ...confirmAction, open })}
        title={confirmAction.type === 'kick' ? 'Kick Player' : 'Ban Player'}
        description={
          confirmAction.type === 'kick'
            ? `Are you sure you want to kick ${selectedPlayer?.username}?`
            : `Are you sure you want to ban ${selectedPlayer?.username}? This will also kick them from the server.`
        }
        variant="danger"
        confirmLabel={confirmAction.type === 'kick' ? 'Kick' : 'Ban'}
        onConfirm={executeAction}
      />
    </div>
  );
}
