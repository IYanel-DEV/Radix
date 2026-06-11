'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ServerDetailTabs } from '@/components/servers/server-detail-tabs';
import { ServerStatusBadge } from '@/components/servers/server-status-badge';
import { ServerActions } from '@/components/servers/server-actions';
import { useServerStore } from '@/stores/server-store';
import { connectSocket, joinServerRoom, leaveServerRoom, disconnectSocket } from '@/lib/socket';

export default function ServerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.id as string;
  const { currentServer, fetchServer, loading, error } = useServerStore();

  useEffect(() => {
    if (!serverId) return;
    const sock = connectSocket();
    fetchServer(serverId);
    const onConnect = () => joinServerRoom(serverId);
    if (sock.connected) {
      joinServerRoom(serverId);
    } else {
      sock.on('connect', onConnect);
    }
    return () => {
      sock.off('connect', onConnect);
      leaveServerRoom(serverId);
    };
  }, [serverId]);

  if (loading && !currentServer) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentServer && error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500">
        <Server className="h-16 w-16 mb-4 text-slate-700" />
        <p className="text-lg mb-2">Server not found</p>
        <p className="text-sm text-slate-600 mb-6">{error}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/servers')}>
            Back to servers
          </Button>
          <Button onClick={() => fetchServer(serverId)}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!currentServer) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500">
        <Server className="h-16 w-16 mb-4 text-slate-700" />
        <p className="text-lg mb-4">Server not found</p>
        <Button variant="outline" onClick={() => router.push('/servers')}>
          Back to servers
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/servers')}
            className="text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white neon-text">{currentServer.name}</h1>
            <ServerStatusBadge status={currentServer.status} />
          </div>
        </div>
        <ServerActions server={currentServer} showLabel />
      </div>
      <ServerDetailTabs server={currentServer} />
    </div>
  );
}
