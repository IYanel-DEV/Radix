'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { DataTable } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { FilterBar } from '@/components/ui/filter-bar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { Ban as BanType } from '@/types';

interface BanListProps {
  bans: BanType[];
  loading?: boolean;
  onCreateBan?: () => void;
}

const statusFilters = [
  { label: 'Active', value: 'active' },
  { label: 'Expired', value: 'expired' },
  { label: 'Permanent', value: 'permanent' },
  { label: 'Temporary', value: 'temporary' },
];

export function BanList({ bans, loading, onCreateBan }: BanListProps) {
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Array<{ key: string; label: string; value: string }>>([]);

  const filtered = useMemo(() => {
    let result = bans;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.playerUsername?.toLowerCase().includes(q) ||
          b.playerId?.includes(q) ||
          b.ipAddress?.includes(q) ||
          b.reason.toLowerCase().includes(q)
      );
    }
    for (const f of activeFilters) {
      if (f.value === 'active') result = result.filter((b) => b.isActive);
      if (f.value === 'expired') result = result.filter((b) => !b.isActive);
      if (f.value === 'permanent') result = result.filter((b) => b.isPermanent);
      if (f.value === 'temporary') result = result.filter((b) => !b.isPermanent);
    }
    return result;
  }, [bans, search, activeFilters]);

  const columns = [
    {
      key: 'playerUsername',
      header: 'Player',
      render: (b: BanType) => (
        <span className="text-slate-200 font-medium">{b.playerUsername || 'Unknown'}</span>
      ),
    },
    { key: 'playerId', header: 'Player ID', render: (b: BanType) => (
      <span className="text-xs font-mono text-slate-500">{b.playerId || b.ipAddress || '-'}</span>
    )},
    { key: 'reason', header: 'Reason' },
    {
      key: 'isPermanent',
      header: 'Duration',
      render: (b: BanType) => (
        b.isPermanent ? (
          <Badge variant="destructive" className="text-[10px]">Permanent</Badge>
        ) : b.expiresAt ? (
          <span className="text-xs text-slate-400">
            Until {format(new Date(b.expiresAt), 'MMM d, yyyy')}
          </span>
        ) : (
          <span className="text-xs text-slate-500">-</span>
        )
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (b: BanType) => (
        <Badge variant={b.isActive ? 'destructive' : 'secondary'}>
          {b.isActive ? 'Active' : 'Expired'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Banned',
      render: (b: BanType) => (
        <span className="text-xs text-slate-400">
          {format(new Date(b.createdAt), 'MMM d, yyyy')}
          <br />
          <span className="text-slate-600">by {b.bannedBy}</span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search bans..."
          className="flex-1"
        />
        {onCreateBan && (
          <Button onClick={onCreateBan}>
            <Plus className="h-4 w-4 mr-2" />
            New Ban
          </Button>
        )}
      </div>
      <FilterBar
        filters={statusFilters.map((f) => ({ ...f, key: 'status' }))}
        activeFilters={activeFilters}
        onAddFilter={(key, value) => setActiveFilters((prev) => [...prev, { key, label: value, value }])}
        onRemoveFilter={(value) => setActiveFilters((prev) => prev.filter((f) => f.value !== value))}
        onClearAll={() => setActiveFilters([])}
      />
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filtered}
            keyExtractor={(b) => b.id}
            loading={loading}
            emptyMessage="No bans found"
          />
        </CardContent>
      </Card>
    </div>
  );
}
