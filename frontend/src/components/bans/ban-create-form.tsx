'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export function BanCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    playerSearch: '',
    reason: '',
    duration: 'permanent',
    customDuration: '',
    type: 'steam' as 'steam' | 'ip' | 'hwid',
    ipBan: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      toast.success('Ban applied');
      router.push('/bans');
    } catch {
      toast.error('Failed to apply ban');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Player Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Search Player</Label>
            <Input
              value={form.playerSearch}
              onChange={(e) => setForm({ ...form, playerSearch: e.target.value })}
              placeholder="Search by name, Steam ID, or IP..."
            />
          </div>
          <div className="space-y-2">
            <Label>Ban Type</Label>
            <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="steam">Steam ID</SelectItem>
                <SelectItem value="ip">IP Address</SelectItem>
                <SelectItem value="hwid">HWID</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ban Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Why is this player being banned?"
            />
          </div>
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="6h">6 Hours</SelectItem>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.duration === 'custom' && (
            <div className="space-y-2">
              <Label>Custom Duration (hours)</Label>
              <Input
                type="number"
                value={form.customDuration}
                onChange={(e) => setForm({ ...form, customDuration: e.target.value })}
                placeholder="e.g. 48"
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <Label>IP Ban</Label>
              <p className="text-xs text-slate-500">Also ban the IP address</p>
            </div>
            <Switch
              checked={form.ipBan}
              onCheckedChange={(checked) => setForm({ ...form, ipBan: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading} variant="destructive">
          {loading ? 'Applying...' : 'Apply Ban'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
