'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useBuildsStore } from '@/stores/builds-store';
import { Package, Upload, Trash2, FileArchive, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { ServerBuild, EngineType } from '@/types';

const ENGINE_OPTIONS: { value: string; label: string }[] = [
  { value: 'godot', label: 'Godot' },
  { value: 'unreal', label: 'Unreal' },
  { value: 'unity', label: 'Unity' },
];

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'warning'> = {
  uploading: 'warning',
  extracting: 'warning',
  ready: 'success',
  failed: 'destructive',
};

const statusLabel: Record<string, string> = {
  uploading: 'Uploading',
  extracting: 'Extracting',
  ready: 'Ready',
  failed: 'Failed',
};

export default function BuildsPage() {
  const { builds, loading, uploading, uploadProgress, fetchBuilds, uploadBuild, deleteBuild } = useBuildsStore();
  const [dragOver, setDragOver] = useState(false);
  const [engineFilter, setEngineFilter] = useState<string>('');
  const [selectedEngine, setSelectedEngine] = useState<string>('godot');
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBuilds(engineFilter || undefined);
  }, [engineFilter, fetchBuilds]);

  const handleUpload = useCallback(async (file: File) => {
    if (uploading) return;
    if (!file.name.endsWith('.zip')) {
      toast.error('Only .zip files are accepted');
      return;
    }
    setUploadingFileName(file.name);
    try {
      await uploadBuild(file, selectedEngine);
      toast.success('Build uploaded and extracted successfully');
      fetchBuilds(engineFilter || undefined);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploadingFileName(null);
    }
  }, [uploading, selectedEngine, uploadBuild, fetchBuilds, engineFilter]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (e.target) e.target.value = '';
  }, [handleUpload]);

  const handleDelete = useCallback(async (build: ServerBuild) => {
    if (!window.confirm(`Delete build ${build.version}? This will remove the zip and extracted files.`)) return;
    try {
      await deleteBuild(build.id);
      toast.success('Build deleted');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  }, [deleteBuild]);

  const columns = [
    { key: 'version', header: 'Version', sortable: true,
      render: (b: ServerBuild) => (
        <span className="font-medium text-slate-200">{b.version}</span>
      ),
    },
    { key: 'engineType', header: 'Engine', sortable: true,
      render: (b: ServerBuild) => (
        <Badge variant="outline" className="capitalize">{b.engineType}</Badge>
      ),
    },
    { key: 'fileName', header: 'File',
      render: (b: ServerBuild) => (
        <span className="text-xs text-slate-400 truncate max-w-[200px] block">{b.fileName}</span>
      ),
    },
    { key: 'fileSize', header: 'Size',
      render: (b: ServerBuild) => <span className="text-xs">{formatSize(b.fileSize)}</span>,
    },
    { key: 'status', header: 'Status',
      render: (b: ServerBuild) => (
        <Badge variant={statusVariant[b.status] || 'secondary'}>
          {statusLabel[b.status] || b.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Uploaded',
      sortable: true,
      render: (b: ServerBuild) => (
        <span className="text-xs text-slate-400">
          {format(new Date(b.createdAt), 'MMM d, yyyy HH:mm')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (b: ServerBuild) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-400 hover:text-red-300"
            onClick={() => handleDelete(b)}
            title="Delete build"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Builds"
        description="Upload and manage server builds"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="h-4 w-4 text-radix-400" />
            Upload New Build
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Engine Type</label>
              <Select value={selectedEngine} onValueChange={setSelectedEngine}>
                <SelectTrigger className="w-40 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENGINE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-9"
            >
              <FileArchive className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              'border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer',
               dragOver ? 'border-radix-500 bg-radix-500/5' : 'border-white/10 hover:border-white/20',
              uploading && 'pointer-events-none opacity-60',
            )}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="space-y-3">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-radix-400" />
                <p className="text-sm text-slate-300">
                  Uploading & extracting {uploadingFileName}...
                </p>
                <Progress value={uploadProgress} className="max-w-xs mx-auto h-2" />
                <p className="text-xs text-slate-500">{uploadProgress}%</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-slate-500" />
                <p className="text-sm text-slate-300">
                  Drag and drop a <span className="font-mono text-radix-400">.zip</span> file here, or click to browse
                </p>
                <p className="text-xs text-slate-500">
                  ZIP containing your dedicated server build ({selectedEngine})
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-radix-400" />
              Build Inventory
              {builds.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{builds.length}</Badge>
              )}
            </CardTitle>
            <Select value={engineFilter} onValueChange={(v) => setEngineFilter(v)}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="All engines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-xs">All engines</SelectItem>
                {ENGINE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={builds}
            keyExtractor={(b) => b.id}
            loading={loading}
            emptyMessage="No builds uploaded yet"
          />
        </CardContent>
      </Card>
    </div>
  );
}
