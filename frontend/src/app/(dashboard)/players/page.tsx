'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { PlayerList } from '@/components/players/player-list';
import type { Player } from '@/types';

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading] = useState(false);

  return (
    <div>
      <PageHeader
        title="Players"
        description="View and manage all players across your servers"
      />
      <PlayerList players={players} loading={loading} />
    </div>
  );
}
