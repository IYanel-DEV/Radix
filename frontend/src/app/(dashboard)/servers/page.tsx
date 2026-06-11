'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { ServerList } from '@/components/servers/server-list';
import { useServerStore } from '@/stores/server-store';

export default function ServersPage() {
  const { servers, fetchServers, loading } = useServerStore();

  useEffect(() => {
    fetchServers();
  }, []);

  return (
    <div>
      <PageHeader
        title="Servers"
        description="Manage all your game servers"
      />
      <ServerList servers={servers} loading={loading} />
    </div>
  );
}
