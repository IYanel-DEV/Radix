'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PlayerProfile } from '@/components/players/player-profile';
import { apiGet } from '@/lib/api';
import type { Player, Warning, Ban } from '@/types';

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      setLoading(true);
      Promise.all([
        apiGet(`/api/players/${params.id}`).catch(() => null),
        apiGet(`/api/players/${params.id}/warnings`).catch(() => null),
        apiGet(`/api/players/${params.id}/bans`).catch(() => null),
      ])
        .then(([p, w, b]) => {
          if (p) setPlayer((p as any).data);
          if (w) setWarnings((w as any).data || []);
          if (b) setBans((b as any).data || []);
        })
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500">
        <p className="text-lg mb-4">Player not found</p>
        <Button variant="outline" onClick={() => router.push('/players')}>
          Back to players
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="ghost"
        onClick={() => router.push('/players')}
        className="mb-4 text-slate-400 hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Players
      </Button>
      <PlayerProfile player={player} warnings={warnings} bans={bans} />
    </div>
  );
}
