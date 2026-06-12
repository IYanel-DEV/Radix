'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { apiGet, apiPost } from '@/lib/api';
import { Sliders, Plus, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

type TuningType = 'string' | 'number' | 'boolean' | 'json';

interface TuningVariable {
  id: string;
  key: string;
  value: string;
  type: TuningType;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const typeConfig: Record<TuningType, { label: string; color: string }> = {
  string: { label: 'String', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  number: { label: 'Number', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  boolean: { label: 'Boolean', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  json: { label: 'JSON', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

export default function TuningPage() {
  const [variables, setVariables] = useState<TuningVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [dataType, setDataType] = useState<TuningType>('string');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchVariables();
  }, []);

  const fetchVariables = async () => {
    try {
      const res: any = await apiGet('/api/v1/tuning');
      setVariables(res.data?.variables || []);
    } catch (err) {
      console.error('Failed to fetch tuning variables', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!keyName.trim()) { toast.error('Key name is required'); return; }
    if (!value.trim()) { toast.error('Value is required'); return; }

    setCreating(true);
    try {
      await apiPost('/api/v1/tuning', {
        key: keyName,
        value,
        type: dataType,
        description: description.trim() || undefined,
      });
      toast.success('Tuning variable created');
      setModalOpen(false);
      setKeyName('');
      setDataType('string');
      setValue('');
      setDescription('');
      fetchVariables();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create variable');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Live Tuning & Remote Config"
          description="Manage runtime configuration variables that update game client behavior in real-time"
        />
      </div>

      <Card className="border-radix-500/30 bg-gradient-to-br from-slate-900 to-slate-950">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sliders className="h-4 w-4 text-radix-400" />
                Configuration Variables
              </CardTitle>
              <CardDescription>
                {variables.length} variable{variables.length !== 1 ? 's' : ''} defined
              </CardDescription>
            </div>
            <Button onClick={() => setModalOpen(true)} className="bg-radix-500 hover:bg-radix-600">
              <Plus className="h-4 w-4 mr-2" />
              Create Variable
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
          ) : variables.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-slate-500">
              <Sliders className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No tuning variables configured</p>
              <p className="text-xs mt-1">Create your first variable to remotely control game client behavior.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider text-left">
                    <th className="pb-3 pr-4 font-medium">Variable Name</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Default Value</th>
                    <th className="pb-3 pr-4 font-medium">Description</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {variables.map((v) => (
                    <tr key={v.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 pr-4">
                        <code className="text-sm text-radix-400 font-mono">{v.key}</code>
                      </td>
                      <td className="py-3.5 pr-4">
                        <Badge variant="outline" className={typeConfig[v.type]?.color || typeConfig.string.color}>
                          {typeConfig[v.type]?.label || v.type}
                        </Badge>
                      </td>
                      <td className="py-3.5 pr-4">
                        <code className="text-xs text-slate-300 font-mono break-all">{v.value}</code>
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-slate-500 max-w-[200px] truncate">
                        {v.description || '—'}
                      </td>
                      <td className="py-3.5 pr-4">
                        <Badge variant={v.isActive ? 'default' : 'secondary'} className="text-xs">
                          {v.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-radix-500/50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-radix-400" />
              Create Tuning Variable
            </DialogTitle>
            <DialogDescription>
              Add a new runtime configuration key that game clients can fetch remotely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                placeholder="e.g., max_player_speed"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataType">Data Type</Label>
              <Select value={dataType} onValueChange={(v) => setDataType(v as TuningType)}>
                <SelectTrigger id="dataType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                placeholder={dataType === 'boolean' ? 'true / false' : dataType === 'number' ? 'e.g., 500' : dataType === 'json' ? '{"key": "value"}' : 'e.g., 500'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="e.g., Maximum player movement speed"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !keyName.trim() || !value.trim()} className="bg-radix-500 hover:bg-radix-600">
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
