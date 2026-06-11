'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Player } from '@/types';

interface PlayerListProps {
  players: Player[];
  loading?: boolean;
}

export function PlayerList({ players, loading }: PlayerListProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return players;
    const q = search.toLowerCase();
    return players.filter(
      (p) =>
        p.username.toLowerCase().includes(q) ||
        p.playerId.includes(q) ||
        (p.ipAddress || '').includes(q)
    );
  }, [players, search]);

  const columns = [
    {
      key: 'username',
      header: 'Player',
      render: (p: Player) => (
        <span
          className="text-slate-200 font-medium cursor-pointer hover:text-radix-400"
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
        <span className="text-xs font-mono text-slate-500">{p.playerId}</span>
      ),
    },
    { key: 'ipAddress', header: 'IP Address' },
    { key: 'totalKills', header: 'Kills' },
    { key: 'totalDeaths', header: 'Deaths' },
    {
      key: 'kdRatio',
      header: 'K/D',
      render: (p: Player) => {
        const kd = p.totalDeaths > 0 ? (p.totalKills / p.totalDeaths).toFixed(2) : p.totalKills.toFixed(2);
        return <span>{kd}</span>;
      },
    },
    {
      key: 'totalPlaytime',
      header: 'Playtime',
      render: (p: Player) => {
        const hrs = Math.floor(p.totalPlaytime / 3600);
        const mins = Math.floor((p.totalPlaytime % 3600) / 60);
        return <span>{hrs}h {mins}m</span>;
      },
    },
    {
      key: 'warnings',
      header: 'Warnings',
      render: (p: Player) => (
        <span className="text-slate-400">{p.warnings}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search players by name, Player ID, or IP..."
        className="max-w-md"
      />
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filtered}
            keyExtractor={(p) => p.id}
            loading={loading}
            emptyMessage="No players found"
          />
        </CardContent>
      </Card>
    </div>
  );
}
