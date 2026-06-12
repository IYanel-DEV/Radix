'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/api';
import { Zap, Clock, Activity, Hash } from 'lucide-react';
import { format } from 'date-fns';

interface PulseStatusCardProps {
  playerId: string;
}

interface PulseData {
  status: string;
  customActivity: string | null;
  currentHubId: string | null;
  updatedAt: string;
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  Online: { label: 'Online', color: 'bg-green-500/20 text-green-400 border-green-500/30', dot: 'bg-green-400' },
  Offline: { label: 'Offline', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', dot: 'bg-slate-400' },
  'In-Match': { label: 'In Match', color: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-400' },
  'In-Menu': { label: 'In Menu', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
};

export function PulseStatusCard({ playerId }: PulseStatusCardProps) {
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (playerId) {
      fetchPulse();
    }
  }, [playerId]);

  const fetchPulse = async () => {
    try {
      const res: any = await apiGet(`/api/game-baas/players/${playerId}/pulse`);
      setPulse(res.pulse || null);
    } catch {
      setPulse(null);
    } finally {
      setLoading(false);
    }
  };

  const config = pulse ? statusConfig[pulse.status] || statusConfig.Offline : statusConfig.Offline;

  return (
    <Card className="border-radix-500/30 bg-gradient-to-br from-slate-900 to-slate-950">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-radix-400" />
          Pulse Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-radix-500 border-t-transparent" />
          </div>
        ) : !pulse ? (
          <p className="text-sm text-slate-500 py-4 text-center">No pulse data available</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${config.dot} animate-pulse`} />
                <Badge variant="outline" className={config.color}>
                  {config.label}
                </Badge>
              </div>
              <span className="text-xs text-slate-500">
                Updated {format(new Date(pulse.updatedAt), 'HH:mm:ss')}
              </span>
            </div>

            {pulse.customActivity && (
              <div className="flex items-center gap-2 text-xs">
                <Activity className="h-3.5 w-3.5 text-radix-400" />
                <span className="text-slate-300">{pulse.customActivity}</span>
              </div>
            )}

            {pulse.currentHubId && (
              <div className="flex items-center gap-2 text-xs">
                <Hash className="h-3.5 w-3.5 text-radix-400" />
                <span className="text-slate-400 font-mono">Hub: {pulse.currentHubId}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>Last updated {format(new Date(pulse.updatedAt), 'MMM d, yyyy HH:mm:ss')}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}