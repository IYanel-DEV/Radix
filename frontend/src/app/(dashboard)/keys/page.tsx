'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { apiPost, apiGet, apiDelete, apiPut } from '@/lib/api';
import { format } from 'date-fns';
import { Key, Trash2, Copy, CheckCircle2, Loader2, Plus, Eye, EyeOff, Shield, Power, PowerOff, Globe, Gamepad2, Code, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

type KeyEnvironment = 'Development' | 'Staging' | 'Production';
type KeyEngine = 'Godot' | 'Unity' | 'Unreal' | 'Custom';

interface KeyPair {
  id: string;
  name: string;
  environment: KeyEnvironment;
  engine: KeyEngine;
  publicKeyPrefix: string;
  secretKeyMasked: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface NewKeyPairResponse extends KeyPair {
  publicKey: string;
  secretKey: string;
}

const envConfig: Record<KeyEnvironment, { label: string; color: string }> = {
  Development: { label: 'Dev', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  Staging: { label: 'Staging', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  Production: { label: 'Prod', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

const engineConfig: Record<KeyEngine, { icon: any; color: string }> = {
  Godot: { icon: Gamepad2, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  Unity: { icon: Code, color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
  Unreal: { icon: Code, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  Custom: { icon: Code, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<KeyPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyPair, setNewKeyPair] = useState<NewKeyPairResponse | null>(null);
  const [keyName, setKeyName] = useState('');
  const [keyEnv, setKeyEnv] = useState<KeyEnvironment>('Development');
  const [keyEngine, setKeyEngine] = useState<KeyEngine>('Godot');
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [activeTab, setActiveTab] = useState<'credentials' | 'guide'>('credentials');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res: any = await apiGet('/api/game-baas/keys');
      setKeys(res.data?.keys || []);
    } catch (err) {
      console.error('Failed to fetch keys', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKeypair = async () => {
    if (!keyName.trim()) {
      toast.error('Please enter a name for the keypair');
      return;
    }

    setGenerating(true);
    try {
      const response: any = await apiPost('/api/game-baas/keys/generate', { name: keyName, environment: keyEnv, engine: keyEngine });
      setNewKeyPair(response.data);
      await fetchKeys();
      setKeyName('');
      setKeyEnv('Development');
      setKeyEngine('Godot');
      setShowSecret(false);
      setModalOpen(false);
      toast.success('Keypair generated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate keypair');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this keypair? This will revoke all active WebSocket connections using it.')) return;

    try {
      await apiDelete(`/api/game-baas/keys/${id}`);
      setKeys(keys.filter((k) => k.id !== id));
      toast.success('Keypair deleted and connections terminated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete keypair');
    }
  };

  const handleToggleActive = async (key: KeyPair) => {
    try {
      await apiPut(`/api/game-baas/keys/${key.id}/toggle`, { isActive: !key.isActive });
      setKeys(keys.map((k) => (k.id === key.id ? { ...k, isActive: !k.isActive } : k)));
      toast.success(`Keypair ${key.isActive ? 'disabled' : 'enabled'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle key status');
    }
  };

  const copyToClipboard = (text: string, type: 'public' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'public') {
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
    toast.success('Copied to clipboard');
  };

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        title="API Credentials"
        description="Manage environment-scoped, engine-tagged keypairs for game client authentication"
      />

      <div className="flex gap-1 border-b border-white/10">
        <button
          onClick={() => setActiveTab('credentials')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'credentials'
              ? 'text-radix-400 border-b-2 border-radix-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="h-4 w-4 inline mr-2" />
          Credentials
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'guide'
              ? 'text-radix-400 border-b-2 border-radix-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="h-4 w-4 inline mr-2" />
          Integration Guide
        </button>
      </div>

      {activeTab === 'credentials' && (
        <>
          <Card className="border-radix-500/30 bg-gradient-to-br from-slate-900 to-slate-950">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Key className="h-4 w-4 text-radix-400" />
                    Credentials Manager
                  </CardTitle>
                  <CardDescription>
                    Generate public/secret keypairs scoped to specific environments and game engines.
                    Public keys use <code className="text-radix-400">radix_pub_</code>, secrets use <code className="text-radix-400">radix_sec_</code>.
                  </CardDescription>
                </div>
                <Button onClick={() => setModalOpen(true)} className="bg-radix-500 hover:bg-radix-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Keypair
                </Button>
              </div>
            </CardHeader>
          </Card>

          {newKeyPair && (
            <Card className="border-green-500/30 bg-gradient-to-br from-green-950 to-slate-950">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-medium text-green-400">New Keypair Created</span>
                    <Badge variant="outline" className={envConfig[newKeyPair.environment].color}>
                      {newKeyPair.environment}
                    </Badge>
                    <Badge variant="outline" className={engineConfig[newKeyPair.engine].color}>
                      {newKeyPair.engine}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setNewKeyPair(null)} className="h-6 text-xs">
                    Dismiss
                  </Button>
                </div>

                <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
                  <p className="text-xs text-amber-400 font-bold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    SECURITY NOTICE: Copy your Secret Key now. It will never be displayed again.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-400 mb-1 block">Public Key</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-900/50 px-3 py-2 rounded text-sm font-mono text-radix-400 break-all border border-radix-500/20">
                        {newKeyPair.publicKey}
                      </code>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(newKeyPair.publicKey, 'public')} className="shrink-0">
                        {copiedPublic ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-slate-400">Secret Key</Label>
                      <button onClick={() => setShowSecret(!showSecret)} className="text-xs text-radix-400 hover:text-radix-300 flex items-center gap-1">
                        {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {showSecret ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-900/50 px-3 py-2 rounded text-sm font-mono text-red-400 break-all border border-red-500/20">
                        {showSecret ? newKeyPair.secretKey : newKeyPair.secretKeyMasked}
                      </code>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(newKeyPair.secretKey, 'secret')} className="shrink-0">
                        {copiedSecret ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-radix-500/30 bg-gradient-to-br from-slate-900 to-slate-950">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Active Keypairs</CardTitle>
                <CardDescription>
                  {keys.length} keypair{keys.length !== 1 ? 's' : ''} registered &middot; Each project is limited to 5 keypairs
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
              ) : keys.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-slate-500">
                  <Key className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No keypairs generated yet</p>
                  <p className="text-xs mt-1">Click &ldquo;Generate Keypair&rdquo; above to create your first credential set.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider text-left">
                        <th className="pb-3 pr-4 font-medium">Name</th>
                        <th className="pb-3 pr-4 font-medium">Environment</th>
                        <th className="pb-3 pr-4 font-medium">Engine</th>
                        <th className="pb-3 pr-4 font-medium">Secret Key</th>
                        <th className="pb-3 pr-4 font-medium">Status</th>
                        <th className="pb-3 pr-4 font-medium">Created</th>
                        <th className="pb-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {keys.map((key) => {
                        const EngineIcon = engineConfig[key.engine]?.icon || Code;
                        return (
                          <tr key={key.id} className="group hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 pr-4">
                              <span className="text-slate-200 font-medium">{key.name}</span>
                            </td>
                            <td className="py-3.5 pr-4">
                              <Badge variant="outline" className={envConfig[key.environment].color}>
                                <Globe className="h-3 w-3 mr-1" />
                                {envConfig[key.environment].label}
                              </Badge>
                            </td>
                            <td className="py-3.5 pr-4">
                              <Badge variant="outline" className={engineConfig[key.engine]?.color || engineConfig.Custom.color}>
                                <EngineIcon className="h-3 w-3 mr-1" />
                                {key.engine}
                              </Badge>
                            </td>
                            <td className="py-3.5 pr-4">
                              <code className="text-xs text-slate-500 font-mono">{key.secretKeyMasked}</code>
                            </td>
                            <td className="py-3.5 pr-4">
                              <Badge variant={key.isActive ? 'default' : 'secondary'} className="text-xs">
                                {key.isActive ? 'Active' : 'Disabled'}
                              </Badge>
                            </td>
                            <td className="py-3.5 pr-4 text-xs text-slate-500 whitespace-nowrap">
                              {format(new Date(key.createdAt), 'MMM d, yyyy')}
                            </td>
                            <td className="py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleToggleActive(key)}
                                  title={key.isActive ? 'Disable key' : 'Enable key'}
                                >
                                  {key.isActive ? <PowerOff className="h-4 w-4 text-slate-400" /> : <Power className="h-4 w-4 text-green-400" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteKey(key.id)}
                                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  title="Revoke and delete keypair"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'guide' && (
        <Card className="border-radix-500/30 bg-gradient-to-br from-slate-900 to-slate-950">
          <CardHeader><CardTitle className="text-sm">Integration Guide</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-400">
            <div className="p-4 rounded-lg border border-radix-500/20 bg-radix-500/5">
              <h4 className="font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-radix-400" />
                Dual-Key Authentication
              </h4>
              <p>Each environment (Dev/Staging/Prod) and engine (Godot/Unity/Unreal/Custom) has isolated credentials. Use the Public Key + Secret Key pair for authentication.</p>
            </div>
            <div>
              <h4 className="font-medium text-slate-300 mb-2">1. Authentication Headers</h4>
              <p>Include credentials in request headers:</p>
              <div className="mt-2 p-3 rounded bg-slate-900/50 font-mono text-xs space-y-1">
                <div><span className="text-slate-500">x-radix-public-key:</span> <span className="text-radix-400">radix_pub_...</span></div>
                <div><span className="text-slate-500">x-radix-secret-key:</span> <span className="text-red-400">radix_sec_...</span></div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-slate-300 mb-1">2. Player JWT</h4>
              <p>After login, use the returned <code className="text-radix-400">accessToken</code> for authenticated requests and WebSocket connections.</p>
            </div>
            <div>
              <h4 className="font-medium text-slate-300 mb-1">3. WebSocket Endpoint</h4>
              <p>Connect to <code className="text-radix-400">wss://your-server/game-client</code> with the player JWT for real-time features.</p>
            </div>
            <div>
              <h4 className="font-medium text-slate-300 mb-1">4. Engine-Specific Keypairs</h4>
              <p>Generate separate keypairs per game engine (Godot, Unity, Unreal, Custom) to isolate client builds and track usage by platform.</p>
            </div>
            <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-400 text-xs">
                <strong>Security Note:</strong> Never expose your Secret Key in client-side code. Each project is limited to 5 active keypairs.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-radix-500/50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-4 w-4 text-radix-400" />
              Generate New Keypair
            </DialogTitle>
            <DialogDescription>
              Create environment-scoped, engine-tagged credentials for game client authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="keyName">Keypair Name</Label>
              <Input
                id="keyName"
                placeholder="e.g., Alpha Client Build"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyEnv">Environment</Label>
              <Select value={keyEnv} onValueChange={(v) => setKeyEnv(v as KeyEnvironment)}>
                <SelectTrigger id="keyEnv">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Development">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-400" />
                      Development
                    </span>
                  </SelectItem>
                  <SelectItem value="Staging">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-purple-400" />
                      Staging
                    </span>
                  </SelectItem>
                  <SelectItem value="Production">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                      Production
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyEngine">Game Engine</Label>
              <Select value={keyEngine} onValueChange={(v) => setKeyEngine(v as KeyEngine)}>
                <SelectTrigger id="keyEngine">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Godot">
                    <span className="flex items-center gap-2">
                      <Gamepad2 className="h-4 w-4 text-cyan-400" />
                      Godot
                    </span>
                  </SelectItem>
                  <SelectItem value="Unity">
                    <span className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-gray-300" />
                      Unity
                    </span>
                  </SelectItem>
                  <SelectItem value="Unreal">
                    <span className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-orange-400" />
                      Unreal
                    </span>
                  </SelectItem>
                  <SelectItem value="Custom">
                    <span className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-slate-400" />
                      Custom
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateKeypair} disabled={generating || !keyName.trim()} className="bg-radix-500 hover:bg-radix-600">
              {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
