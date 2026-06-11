'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Download, RotateCcw, Plus, HardDrive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import toast from 'react-hot-toast';
import api, { apiPost } from '@/lib/api';
import type { Backup } from '@/types';

interface ServerBackupsProps {
  serverId: string;
}

export function ServerBackups({ serverId }: ServerBackupsProps) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    loadBackups();
  }, [serverId]);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/servers/${serverId}/backups`);
      setBackups(res.data.data || res.data || []);
    } catch {
      setBackups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await apiPost(`/api/servers/${serverId}/backups`, { name: `Backup ${format(new Date(), 'yyyy-MM-dd HH:mm')}` });
      toast.success('Backup created');
      await loadBackups();
    } catch {
      toast.error('Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    if (restoreTarget) {
      try {
        await apiPost(`/api/servers/${serverId}/backups/${restoreTarget.id}/restore`, {});
        toast.success('Backup restored successfully');
        await loadBackups();
      } catch {
        toast.error('Failed to restore backup');
      } finally {
        setConfirmOpen(false);
        setRestoreTarget(null);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const columns = [
    { key: 'name', header: 'Name' },
    {
      key: 'fileSize',
      header: 'Size',
      render: (b: Backup) => formatSize(b.fileSize),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (b: Backup) => format(new Date(b.createdAt), 'MMM d, yyyy HH:mm'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b: Backup) => (
        <Badge
          variant={
            b.status === 'completed' ? 'success' :
            b.status === 'in_progress' ? 'warning' :
            b.status === 'failed' ? 'destructive' : 'secondary'
          }
        >
          {b.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (b: Backup) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Download">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-amber-400"
            title="Restore"
            onClick={() => {
              setRestoreTarget(b);
              setConfirmOpen(true);
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-sky-400" />
            Backups
          </CardTitle>
          <Button onClick={handleCreateBackup} disabled={creating} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {creating ? 'Creating...' : 'Create Backup'}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-slate-400 py-8">Loading backups...</div>
          ) : backups.length === 0 ? (
            <EmptyState
              icon={<HardDrive className="h-12 w-12 text-slate-600" />}
              title="No backups yet"
              description="Create your first backup to protect your server data."
            />
          ) : (
            <DataTable columns={columns} data={backups} keyExtractor={(b: Backup) => b.id} />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Restore Backup"
        description={`Are you sure you want to restore "${restoreTarget?.name}"? The server will be stopped during the restore process.`}
        onConfirm={handleRestore}
        confirmLabel="Restore"
        variant="danger"
      />
    </div>
  );
}