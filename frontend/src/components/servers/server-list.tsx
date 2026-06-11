'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { ServerCard } from './server-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { Server } from '@/types';

const statusFilters = [
  { label: 'Running', value: 'running' },
  { label: 'Stopped', value: 'stopped' },
  { label: 'Crashed', value: 'crashed' },
  { label: 'Starting', value: 'starting' },
];

interface ServerListProps {
  servers: Server[];
  loading?: boolean;
}

export function ServerList({ servers, loading }: ServerListProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Array<{ key: string; label: string; value: string }>>([]);

  const filteredServers = useMemo(() => {
    let result = servers;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.map?.toLowerCase().includes(q) ||
          s.region?.toLowerCase().includes(q)
      );
    }

    if (activeFilters.length > 0) {
      const statusValues = activeFilters.map((f) => f.value);
      result = result.filter((s) => statusValues.includes(s.status));
    }

    return result;
  }, [servers, search, activeFilters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search servers by name, map, or region..."
          className="flex-1"
        />
        <Button onClick={() => router.push('/servers/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Server
        </Button>
      </div>

      <FilterBar
        filters={statusFilters.map((f) => ({ ...f, key: 'status' }))}
        activeFilters={activeFilters}
        onAddFilter={(key, value) => {
          setActiveFilters((prev) => [...prev, { key, label: value, value }]);
        }}
        onRemoveFilter={(value) => {
          setActiveFilters((prev) => prev.filter((f) => f.value !== value));
        }}
        onClearAll={() => setActiveFilters([])}
        className="mb-6"
      />

      {servers.length === 0 ? (
        <EmptyState
          icon={<></>}
          title="No servers found"
          description="Get started by creating your first game server."
          action={
            <Button onClick={() => router.push('/servers/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Server
            </Button>
          }
        />
      ) : filteredServers.length === 0 ? (
        <EmptyState
          title="No matching servers"
          description="Try adjusting your search or filters."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredServers.map((server, i) => (
            <ServerCard key={server.id} server={server} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
