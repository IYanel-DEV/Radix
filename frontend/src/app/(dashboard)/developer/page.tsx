'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiPost, apiGet, apiDelete } from '@/lib/api';
import { format } from 'date-fns';
import { Key, Trash2, Copy, CheckCircle2, Loader2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApiKey {
  id: string;
  name: string;
  tokenPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface NewKeyResponse extends ApiKey {
  token: string;
}

export default function DeveloperPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<NewKeyResponse | null>(null);
  const [keyName, setKeyName] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res: any = await apiGet('/api/game-baas/keys');
      setKeys(res.keys || []);
    } catch (err) {
      console.error('Failed to fetch keys', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!keyName.trim()) {
      toast.error('Please enter a name for the key');
      return;
    }

    setGenerating(true);
    try {
      const response: any = await apiPost('/api/game-baas/keys', { name: keyName });
      setNewKey(response);
      setKeys([...keys, response]);
      setKeyName('');
      toast.success('API key generated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate key');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) return;

    try {
      await apiDelete(`/api/game-baas/keys/${id}`);
      setKeys(keys.filter((k) => k.id !== id));
      toast.success('API key deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Developer Settings"
        description="Manage game API credentials for external integrations"
      />

      <Card className="border-radix-500/30 bg-gradient-to-br from-slate-900 to-slate-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Key className="h-4 w-4 text-radix-400" />
            Game API Credentials
          </CardTitle>
          <CardDescription>
            Generate API tokens to authenticate game clients with the Radix BaaS layer.
            Tokens are prefixed with <code className="text-radix-400">radix_pub_</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {newKey && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-400">New API Key Created</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewKey(null)}
                  className="h-6 text-xs"
                >
                  Dismiss
                </Button>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Copy this token now. You will not be able to see it again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-900/50 px-3 py-2 rounded text-sm font-mono text-radix-400 break-all">
                  {newKey.token}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(newKey.token)}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="keyName">Token Name</Label>
              <Input
                id="keyName"
                placeholder="e.g., Godot Game Server"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateKey()}
              />
            </div>
            <Button
              onClick={handleGenerateKey}
              disabled={generating || !keyName.trim()}
              className="bg-radix-500 hover:bg-radix-600"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Generate New Token
            </Button>
          </div>

          <Separator className="bg-white/5" />

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-300">Active API Keys</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : keys.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No API keys generated yet</p>
            ) : (
              <div className="space-y-2">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">{key.name}</span>
                        <Badge variant={key.isActive ? 'default' : 'secondary'} className="text-xs">
                          {key.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <code className="text-xs text-slate-500">{key.tokenPrefix}****</code>
                        <span className="text-xs text-slate-600">
                          Created {format(new Date(key.createdAt), 'MMM d, yyyy')}
                        </span>
                        {key.lastUsedAt && (
                          <span className="text-xs text-slate-600">
                            Last used {format(new Date(key.lastUsedAt), 'MMM d, yyyy HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteKey(key.id)}
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-radix-500/30 bg-gradient-to-br from-slate-900 to-slate-950">
        <CardHeader>
          <CardTitle className="text-sm">Integration Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-400">
          <div>
            <h4 className="font-medium text-slate-300 mb-1">1. Authentication</h4>
            <p>Include the game API token in the <code className="text-radix-400">x-radix-game-token</code> header when registering or logging in players.</p>
          </div>
          <div>
            <h4 className="font-medium text-slate-300 mb-1">2. Player JWT</h4>
            <p>After login, use the returned <code className="text-radix-400">accessToken</code> for authenticated requests and WebSocket connections.</p>
          </div>
          <div>
            <h4 className="font-medium text-slate-300 mb-1">3. WebSocket Endpoint</h4>
            <p>Connect to <code className="text-radix-400">ws://your-server/game-client</code> with the player JWT.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}