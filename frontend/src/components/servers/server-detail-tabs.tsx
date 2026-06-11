'use client';

import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServerOverview } from './server-overview';
import { ServerPlayers } from './server-players';
import { ServerSettings } from './server-settings';
import type { Server } from '@/types';

const ServerPerformance = dynamic(() => import('./server-performance').then(m => ({ default: m.ServerPerformance })), { ssr: false });
const ServerConsole = dynamic(() => import('./server-console').then(m => ({ default: m.ServerConsole })), { ssr: false });
const ServerBackups = dynamic(() => import('./server-backups').then(m => ({ default: m.ServerBackups })), { ssr: false });
const ServerBuildSelector = dynamic(() => import('../builds/server-build-selector').then(m => ({ default: m.ServerBuildSelector })), { ssr: false });

interface ServerDetailTabsProps {
  server: Server;
}

export function ServerDetailTabs({ server }: ServerDetailTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
        <TabsTrigger value="players">Players ({server.playerCount})</TabsTrigger>
        <TabsTrigger value="console">Console</TabsTrigger>
        <TabsTrigger value="builds">Builds</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="backups">Backups</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <ServerOverview server={server} />
      </TabsContent>
      <TabsContent value="performance">
        <ServerPerformance serverId={server.id} />
      </TabsContent>
      <TabsContent value="players">
        <ServerPlayers server={server} />
      </TabsContent>
      <TabsContent value="console">
        <ServerConsole serverId={server.id} serverName={server.name} isRunning={server.status === 'running'} />
      </TabsContent>
      <TabsContent value="builds">
        <ServerBuildSelector
          serverId={server.id}
          engineType={server.engineType}
          currentBuildId={server.buildId}
          isRunning={server.status === 'running'}
        />
      </TabsContent>
      <TabsContent value="settings">
        <ServerSettings server={server} />
      </TabsContent>
      <TabsContent value="backups">
        <ServerBackups serverId={server.id} />
      </TabsContent>
    </Tabs>
  );
}
