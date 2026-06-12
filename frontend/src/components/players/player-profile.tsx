'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PlayerCard } from './player-card';
import { PlayerActions } from './player-actions';
import { IdentityLinksCard } from './identity-links-card';
import { PulseStatusCard } from './pulse-status-card';
import type { Player, Warning, Ban } from '@/types';

interface PlayerProfileProps {
  player: Player;
  warnings: Warning[];
  bans: Ban[];
}

export function PlayerProfile({ player, warnings, bans }: PlayerProfileProps) {
  const activeBans = bans.filter((b) => b.isActive);
  const activeWarnings = warnings;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-slate-800 text-xl text-slate-400">
                  {player.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-100">{player.username}</h2>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">Player ID: {player.playerId}</p>
                <p className="text-sm text-slate-500">IP: {player.ipAddress}</p>
                <p className="text-xs text-slate-600 mt-1">
                  First seen: {new Date(player.firstSeen).toLocaleDateString()}
                </p>
              </div>
            </div>
            <PlayerActions player={player} />
          </div>
        </CardContent>
      </Card>

      <PlayerCard player={player} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Active Warnings ({activeWarnings.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeWarnings.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No active warnings</p>
            ) : (
              <div className="space-y-2">
                {activeWarnings.map((w) => (
                  <div key={w.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-sm text-slate-200">{w.reason}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(w.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Ban History ({bans.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bans.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No bans on record</p>
            ) : (
              <div className="space-y-2">
                {bans.map((b) => (
                  <div
                    key={b.id}
                    className={`rounded-lg border p-3 ${
                      b.isActive
                        ? 'border-red-500/20 bg-red-500/5'
                        : 'border-slate-800 bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-200">{b.reason}</p>
                      {b.isActive && <Badge variant="destructive">Active</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      By {b.bannedBy} &middot; {new Date(b.createdAt).toLocaleDateString()}
                      {b.expiresAt && ` · Expires ${new Date(b.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IdentityLinksCard playerId={player.playerId} />
        <PulseStatusCard playerId={player.playerId} />
      </div>
    </div>
  );
}
