'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { Link2, Plus, Unlink, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

type Platform = 'anonymous' | 'steam' | 'epic' | 'discord' | 'xbox' | 'playstation' | 'nintendo';

interface IdentityLink {
  id: string;
  platform: Platform;
  platformId: string;
  linkedAt: string;
}

interface IdentityLinksCardProps {
  playerId: string;
}

const platformConfig: Record<Platform, { label: string; color: string; icon: string }> = {
  anonymous: { label: 'Anonymous', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: '?' },
  steam: { label: 'Steam', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: 'S' },
  epic: { label: 'Epic', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', icon: 'E' },
  discord: { label: 'Discord', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: 'D' },
  xbox: { label: 'Xbox', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: 'X' },
  playstation: { label: 'PlayStation', color: 'bg-blue-600/20 text-blue-300 border-blue-600/30', icon: 'P' },
  nintendo: { label: 'Nintendo', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: 'N' },
};

const availablePlatforms: Platform[] = ['steam', 'epic', 'discord', 'xbox', 'playstation', 'nintendo'];

export function IdentityLinksCard({ playerId }: IdentityLinksCardProps) {
  const [links, setLinks] = useState<IdentityLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlatform, setNewPlatform] = useState<Platform>('steam');
  const [newPlatformId, setNewPlatformId] = useState('');

  useEffect(() => {
    if (playerId) {
      fetchLinks();
    }
  }, [playerId]);

  const fetchLinks = async () => {
    try {
      const res: any = await apiGet('/api/v1/public/players/identities');
      setLinks(res.identities || []);
    } catch (err) {
      console.error('Failed to fetch identity links', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!newPlatformId.trim()) {
      toast.error('Platform ID is required');
      return;
    }

    setLinking(true);
    try {
      await apiPost('/api/v1/public/players/identities/link', {
        platform: newPlatform,
        platformId: newPlatformId,
      });
      toast.success(`${platformConfig[newPlatform].label} account linked`);
      setShowAddForm(false);
      setNewPlatformId('');
      fetchLinks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to link account');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (platform: Platform) => {
    if (!window.confirm(`Unlink ${platformConfig[platform].label}?`)) return;

    try {
      await apiDelete(`/api/v1/public/players/identities/${platform}`);
      toast.success('Account unlinked');
      fetchLinks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unlink account');
    }
  };

  const linkedPlatforms = links.map((l) => l.platform);
  const unlinkedPlatforms = availablePlatforms.filter((p) => !linkedPlatforms.includes(p));

  return (
    <Card className="border-radix-500/30 bg-gradient-to-br from-slate-900 to-slate-950">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="h-4 w-4 text-radix-400" />
            Identity Links
            <Badge variant="secondary" className="ml-1 text-xs">{links.length}</Badge>
          </CardTitle>
          {!showAddForm && unlinkedPlatforms.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Link
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : links.length === 0 && !showAddForm ? (
          <p className="text-sm text-slate-500 py-4 text-center">No platform accounts linked</p>
        ) : (
          <>
            {links.map((link) => {
              const config = platformConfig[link.platform];
              return (
                <div
                  key={link.id}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${config.color} border flex items-center justify-center text-xs font-bold`}>
                      {config.icon}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200">{config.label}</div>
                      <div className="text-xs text-slate-500 font-mono truncate max-w-[150px]">
                        {link.platformId}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleUnlink(link.platform)}
                  >
                    <Unlink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}

            {showAddForm && (
              <div className="space-y-3 rounded-lg border border-radix-500/30 bg-radix-500/5 p-3">
                <div className="flex items-center gap-2">
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value as Platform)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200"
                  >
                    {unlinkedPlatforms.map((p) => (
                      <option key={p} value={p}>
                        {platformConfig[p].label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Platform User ID"
                  value={newPlatformId}
                  onChange={(e) => setNewPlatformId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleLink} disabled={linking} className="bg-radix-500 hover:bg-radix-600">
                    {linking && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Link
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}