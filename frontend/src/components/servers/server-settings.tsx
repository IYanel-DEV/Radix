'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useServerStore } from '@/stores/server-store';
import toast from 'react-hot-toast';
import type { Server } from '@/types';

interface ServerSettingsProps {
  server: Server;
}

export function ServerSettings({ server }: ServerSettingsProps) {
  const updateServer = useServerStore((s) => s.updateServer);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: server.name,
    description: server.description || '',
    map: server.map || '',
    gameMode: server.gameMode || '',
    maxPlayers: server.maxPlayers,
    port: server.port,
    queryPort: server.queryPort,
    password: server.password || '',
    autoRestart: server.autoRestart,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateServer(server.id, form);
      toast.success('Settings saved');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Basic Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Server Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Map</Label>
              <Input
                value={form.map}
                onChange={(e) => setForm({ ...form, map: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Game Mode</Label>
              <Input
                value={form.gameMode}
                onChange={(e) => setForm({ ...form, gameMode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Players</Label>
              <Input
                type="number"
                value={form.maxPlayers}
                onChange={(e) => setForm({ ...form, maxPlayers: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password (leave empty for none)</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="No password set"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Port Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Game Port</Label>
              <Input
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Query Port</Label>
              <Input
                type="number"
                value={form.queryPort}
                onChange={(e) => setForm({ ...form, queryPort: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Other Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto Restart</Label>
              <p className="text-xs text-slate-500">Automatically restart the server if it crashes</p>
            </div>
            <Switch
              checked={form.autoRestart}
              onCheckedChange={(checked) => setForm({ ...form, autoRestart: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="outline" onClick={() => {
          setForm({
            name: server.name,
            description: server.description || '',
            map: server.map || '',
            gameMode: server.gameMode || '',
            maxPlayers: server.maxPlayers,
            port: server.port,
            queryPort: server.queryPort,
            password: server.password || '',
            autoRestart: server.autoRestart,
          });
        }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
