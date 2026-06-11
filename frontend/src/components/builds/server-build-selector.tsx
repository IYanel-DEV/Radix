'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBuildsStore } from '@/stores/builds-store';
import { apiPost } from '@/lib/api';
import { getApiError } from '@/lib/api';
import { Rocket, Package, Loader2, RefreshCw } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import toast from 'react-hot-toast';
import type { ServerBuild } from '@/types';

interface ServerBuildSelectorProps {
  serverId: string;
  engineType: string;
  currentBuildId?: string;
  isRunning?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function ServerBuildSelector({ serverId, engineType, currentBuildId, isRunning }: ServerBuildSelectorProps) {
  const { builds, loading, fetchBuilds } = useBuildsStore();
  const [deployingId, setDeployingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBuilds(engineType);
  }, [engineType, fetchBuilds]);

  const handleDeploy = async (buildId: string) => {
    const build = builds.find((b) => b.id === buildId);
    if (!build) return;

    const msg = isRunning
      ? `Deploy ${build.version}? The server will be hot-restarted.`
      : `Deploy build ${build.version} to this server?`;

    if (!window.confirm(msg)) return;

    setDeployingId(buildId);
    try {
      const response: any = await apiPost(`/api/servers/${serverId}/deploy`, { buildId });
      toast.success(response.message || 'Build deployed');
      fetchBuilds(engineType);
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setDeployingId(null);
    }
  };

  const readyBuilds = builds.filter((b) => b.status === 'ready');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4 text-radix-400" />
            Available Builds
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => fetchBuilds(engineType)}
            title="Refresh builds"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : readyBuilds.length === 0 ? (
          <EmptyState
            icon={<Package className="h-8 w-8 text-slate-600" />}
            title="No builds available"
            description={`Upload a ${engineType} build to get started.`}
          />
        ) : (
          <div className="divide-y divide-white/5">
            {readyBuilds.map((build) => {
              const isCurrent = build.id === currentBuildId;
              const isDeploying = deployingId === build.id;

              return (
                <div key={build.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">{build.version}</span>
                      {isCurrent && (
                        <Badge variant="outline" className="text-[10px] h-5 text-radix-400 border-radix-500/30">
                          Active
                        </Badge>
                      )}
                      {build.isRollback && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          Rollback
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-500">{build.fileName}</span>
                      <span className="text-xs text-slate-600">{formatSize(build.fileSize)}</span>
                      <span className="text-xs text-slate-600">
                        {format(new Date(build.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={isCurrent || isDeploying}
                    onClick={() => handleDeploy(build.id)}
                    className="h-8 shrink-0 ml-4"
                  >
                    {isDeploying ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Rocket className="h-3.5 w-3.5 mr-1" />
                    )}
                    {isDeploying ? 'Deploying...' : isCurrent ? 'Active' : 'Deploy'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
