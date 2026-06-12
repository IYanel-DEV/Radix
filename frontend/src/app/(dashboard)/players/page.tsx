'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { PlayerList } from '@/components/players/player-list';
import { IdentityLinksCard } from '@/components/players/identity-links-card';
import { PulseStatusCard } from '@/components/players/pulse-status-card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet } from '@/lib/api';
import type { GamePlayer } from '@/types';

interface PlayersResponse {
  players: GamePlayer[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [meta, setMeta] = useState<PlayersResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedPlayer, setSelectedPlayer] = useState<GamePlayer | null>(null);

  const fetchPlayers = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const res: any = await apiGet('/api/v1/game-baas/players', { page: currentPage, limit: 20 });
      setPlayers(res.data?.players || []);
      setMeta(res.data?.meta || null);
    } catch (err) {
      console.error('Failed to fetch players', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers(page);
  }, [page, fetchPlayers]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedPlayer(null);
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <PageHeader
          title="Players"
          description="View and manage all players across your game project"
        />
        <PlayerList
          players={players}
          loading={loading}
          meta={meta || undefined}
          onPageChange={handlePageChange}
          onPlayerSelect={(p) => setSelectedPlayer(p)}
        />
      </div>

      <AnimatePresence>
        {selectedPlayer && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden border-l border-white/5 pl-6"
          >
            <div className="w-[380px] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-200">{selectedPlayer.username}</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedPlayer.email}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedPlayer(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <PulseStatusCard playerId={selectedPlayer.id} />
              <IdentityLinksCard playerId={selectedPlayer.id} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
