'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Player } from '@/types';

interface PlayerCardProps {
  player: Player;
}

export function PlayerCard({ player }: PlayerCardProps) {
  const kd = player.totalDeaths > 0 ? (player.totalKills / player.totalDeaths).toFixed(2) : player.totalKills.toFixed(2);
  const playtimeHrs = Math.floor(player.totalPlaytime / 3600);
  const playtimeMins = Math.floor((player.totalPlaytime % 3600) / 60);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-slate-500 uppercase">K/D Ratio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-slate-100">{kd}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-slate-500 uppercase">Playtime</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-slate-100">{playtimeHrs}h {playtimeMins}m</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-slate-500 uppercase">Banned</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-slate-100">{player.isBanned ? 'Yes' : 'No'}</p>
        </CardContent>
      </Card>
    </div>
  );
}
