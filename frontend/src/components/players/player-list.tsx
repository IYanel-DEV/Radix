'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { GamePlayer } from '@/types';

interface PlayerListProps {
  players: GamePlayer[];
  loading?: boolean;
  meta?: { page: number; limit: number; total: number; totalPages: number };
  onPageChange?: (page: number) => void;
  onPlayerSelect?: (player: GamePlayer) => void;
}

export function PlayerList({ players, loading, meta, onPageChange, onPlayerSelect }: PlayerListProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return players;
    const q = search.toLowerCase();
    return players.filter(
      (p) =>
        p.username.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.id.includes(q)
    );
  }, [players, search]);

  const columns = [
    {
      key: 'username',
      header: 'Player',
      render: (p: GamePlayer) => (
        <span
          className="text-zinc-100 font-medium cursor-pointer hover:text-violet-400"
          onClick={() => onPlayerSelect ? onPlayerSelect(p) : router.push(`/players/${p.id}`)}
        >
          {p.username}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (p: GamePlayer) => (
        <span className="text-xs text-slate-400">{p.email}</span>
      ),
    },
    {
      key: 'isOnline',
      header: 'Status',
      render: (p: GamePlayer) => (
        <Badge variant={p.isOnline ? 'success' : 'secondary'} className="text-xs">
          <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${p.isOnline ? 'bg-green-500' : 'bg-zinc-600'}`} />
          {p.isOnline ? 'Online' : 'Offline'}
        </Badge>
      ),
    },
    {
      key: 'lastSeenAt',
      header: 'Last Seen',
      render: (p: GamePlayer) => (
        <span className="text-xs text-slate-500">
          {p.lastSeenAt ? new Date(p.lastSeenAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Registered',
      render: (p: GamePlayer) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {new Date(p.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search players by name, email, or ID..."
        className="max-w-md"
      />
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div
                className="rounded-full border-2 border-zinc-800 border-t-violet-500 animate-spin"
                style={{ width: 24, height: 24 }}
              />
            </div>
          ) : players.length === 0 && !search ? (
            <EmptyState
              icon={<Users className="h-12 w-12 text-slate-600" />}
              title="No players found"
              description="Launch your game client to register your first player. Registered players will appear here."
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={filtered}
                keyExtractor={(p) => p.id}
                loading={false}
                emptyMessage={search ? 'No players match your search' : 'No players registered yet'}
              />
              {meta && meta.totalPages > 1 && (
                <div className="border-t border-white/[0.06] px-4 py-3">
                  <Pagination
                    currentPage={meta.page}
                    totalPages={meta.totalPages}
                    onPageChange={(page) => onPageChange?.(page)}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      {meta && !loading && (
        <p className="text-xs text-slate-500 text-center">
          {meta.total} player{meta.total !== 1 ? 's' : ''} total
        </p>
      )}
    </div>
  );
}
