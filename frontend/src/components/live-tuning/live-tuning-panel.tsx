'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { format } from 'date-fns';
import { Settings, Plus, Pencil, Trash2, Loader2, RefreshCw, Key, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

type TuningType = 'string' | 'number' | 'boolean' | 'json';

interface TuningVariable {
  id: string;
  key: string;
  value: string;
  type: TuningType;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const typeColors: Record<TuningType, string> = {
  string: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  number: 'bg-green-500/20 text-green-400 border-green-500/30',
  boolean: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  json: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const typeOptions: { value: TuningType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'json', label: 'JSON' },
];

export function LiveTuningPanel() {
  const [variables, setVariables] = useState<TuningVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVar, setEditingVar] = useState<TuningVariable | null>(null);

  const [form, setForm] = useState({
    key: '',
    value: '',
    type: 'string' as TuningType,
    description: '',
  });

  useEffect(() => {
    fetchVariables();
  }, []);

  const fetchVariables = async () => {
    try {
      const res: any = await apiGet('/api/v1/tuning');
      setVariables(res.variables || []);
    } catch (err) {
      console.error('Failed to fetch tuning variables', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingVar(null);
    setForm({ key: '', value: '', type: 'string', description: '' });
    setModalOpen(true);
  };

  const handleEdit = (variable: TuningVariable) => {
    setEditingVar(variable);
    setForm({
      key: variable.key,
      value: variable.value,
      type: variable.type,
      description: variable.description || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.key.trim() || !form.value.trim()) {
      toast.error('Key and value are required');
      return;
    }

    if (form.type === 'number' && isNaN(Number(form.value))) {
      toast.error('Value must be a valid number');
      return;
    }

    if (form.type === 'boolean' && !['true', 'false', '1', '0'].includes(form.value)) {
      toast.error('Boolean value must be true/false or 1/0');
      return;
    }

    setSaving(true);
    try {
      if (editingVar) {
        await apiPut(`/api/v1/tuning/${editingVar.id}`, form);
        toast.success('Variable updated');
      } else {
        await apiPost('/api/v1/tuning', form);
        toast.success('Variable created');
      }
      setModalOpen(false);
      fetchVariables();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save variable');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (variable: TuningVariable) => {
    if (!window.confirm(`Delete "${variable.key}"?`)) return;
    try {
      await apiDelete(`/api/v1/tuning/${variable.id}`);
      toast.success('Variable deleted');
      fetchVariables();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete variable');
    }
  };

  const columns = [
    {
      key: 'key',
      header: 'Key',
      sortable: true,
      render: (v: TuningVariable) => (
        <div className="flex items-center gap-2">
          <Key className="h-3.5 w-3.5 text-radix-400" />
          <code className="text-sm text-radix-300 font-mono">{v.key}</code>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      render: (v: TuningVariable) => (
        <code className="text-xs text-slate-400 bg-slate-900/50 px-2 py-1 rounded max-w-[200px] block truncate">
          {v.value}
        </code>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (v: TuningVariable) => (
        <Badge variant="outline" className={typeColors[v.type]}>
          {v.type}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (v: TuningVariable) => (
        <span className="text-sm text-slate-500 truncate max-w-[150px] block">
          {v.description || '-'}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (v: TuningVariable) => (
        <Badge variant={v.isActive ? 'default' : 'secondary'}>
          {v.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      sortable: true,
      render: (v: TuningVariable) => (
        <span className="text-xs text-slate-500">
          {format(new Date(v.updatedAt), 'MMM d, yyyy HH:mm')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (v: TuningVariable) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(v)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleDelete(v)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Tuning"
        description="Runtime configuration variables for your game client"
      />

      <Card className="border-radix-500/30 bg-gradient-to-br from-slate-900 to-slate-950">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-radix-400" />
              <CardTitle className="text-sm">Configuration Variables</CardTitle>
              <Badge variant="secondary" className="ml-1 text-xs">{variables.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchVariables}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={handleCreate} size="sm" className="bg-radix-500 hover:bg-radix-600">
                <Plus className="h-4 w-4 mr-1" />
                Add Variable
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={columns} data={variables} keyExtractor={(v) => v.id} loading={loading} emptyMessage="No tuning variables configured" />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-radix-500/50">
          <DialogHeader>
            <DialogTitle>{editingVar ? 'Edit Variable' : 'Create Variable'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key">Variable Key</Label>
              <Input
                id="key"
                placeholder="e.g., max_player_speed"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                disabled={!!editingVar}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as TuningType })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">
                Value {form.type === 'boolean' && <span className="text-slate-500">(true/false/1/0)</span>}
              </Label>
              <Input
                id="value"
                placeholder={form.type === 'number' ? '42' : form.type === 'boolean' ? 'true' : form.type === 'json' ? '{"key": "value"}' : 'Enter value'}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="What does this variable control?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-radix-500 hover:bg-radix-600">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingVar ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}