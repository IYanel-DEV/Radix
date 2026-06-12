'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServerStore } from '@/stores/server-store';
import { cn } from '@/lib/utils';
import { Upload, FileArchive, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const regions = ['US East', 'US West', 'EU Central', 'EU West', 'Asia Southeast', 'Asia East', 'Oceania', 'South America'];

const engines = [
  { value: 'godot', label: 'Godot Engine', description: 'Godot dedicated server - fully supported' },
  { value: 'unreal', label: 'Unreal Engine', description: 'Unreal Engine dedicated server - adapter ready' },
  { value: 'unity', label: 'Unity Engine', description: 'Unity dedicated server - adapter ready' },
];

export function ServerCreateForm() {
  const router = useRouter();
  const createServerWithZip = useServerStore((s) => s.createServerWithZip);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', description: '', engineType: '', map: 'DefaultMap', gameMode: 'Default',
    maxPlayers: 50, port: 7777, queryPort: 27015, password: '',
    region: '', startupCommand: '', autoRestart: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (step === 1 && !form.engineType) errs.engineType = 'Select a game engine';
    if (step === 2) {
      if (!selectedFile) errs.file = 'A ZIP file is required';
      if (!form.name.trim()) errs.name = 'Server name is required';
      if (form.port < 1024 || form.port > 65535) errs.port = 'Port must be between 1024 and 65535';
      if (form.queryPort < 1024 || form.queryPort > 65535) errs.queryPort = 'Port must be between 1024 and 65535';
      if (form.maxPlayers < 1 || form.maxPlayers > 255) errs.maxPlayers = 'Must be between 1 and 255';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!selectedFile) { toast.error('Please select a ZIP file'); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('name', form.name);
      fd.append('engineType', form.engineType);
      fd.append('port', String(form.port));
      fd.append('queryPort', String(form.queryPort));
      fd.append('maxPlayers', String(form.maxPlayers));
      fd.append('buildVersion', '1.0.0');
      fd.append('region', form.region || 'US East');
      fd.append('password', form.password || '');
      fd.append('description', form.description || '');
      fd.append('map', form.map || 'DefaultMap');
      fd.append('gameMode', form.gameMode || 'Default');
      fd.append('startupCommand', form.startupCommand || '');
      fd.append('autoRestart', form.autoRestart ? 'true' : 'false');

      const server = await createServerWithZip(fd, setUploadProgress);
      toast.success('Server created successfully');
      if (server?.id) {
        router.push(`/servers/${server.id}`);
      } else {
        router.push('/servers');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to create server';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => { if (validate()) setStep(step + 1); };
  const handleBack = () => setStep(step - 1);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.zip')) {
      setSelectedFile(file);
    } else {
      toast.error('Only .zip files are accepted');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
    if (e.target) e.target.value = '';
  }, []);

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              s === step ? 'bg-violet-600 text-white' :
              s < step ? 'bg-radix-600 text-white' : 'bg-white/5 text-slate-400'
            }`}>
              {s < step ? '\u2713' : s}
            </div>
            <span className={`ml-2 text-sm ${s === step ? 'text-slate-200' : 'text-slate-500'}`}>
              {s === 1 ? 'Engine' : s === 2 ? 'Upload & Configure' : 'Review'}
            </span>
            {s < 3 &&                   <div className="w-16 h-px bg-white/10 mx-3" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Game Engine</CardTitle>
            <CardDescription>Choose the game engine for your dedicated server</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {engines.map((e) => (
                <button
                  key={e.value} type="button"
                  onClick={() => setForm({ ...form, engineType: e.value })}
                  className={`text-left p-4 rounded-lg border transition-colors ${
                    form.engineType === e.value
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div>
                      <p className="font-medium text-slate-200">{e.label}</p>
                      <p className="text-sm text-slate-400 mt-1">{e.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {errors.engineType && <p className="text-red-400 text-sm">{errors.engineType}</p>}
            <div className="flex justify-end">
              <Button type="button" disabled={!form.engineType} onClick={handleNext}>
                Next - Upload Build
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Build & Configure</CardTitle>
            <CardDescription>
              Upload a {engines.find(e => e.value === form.engineType)?.label} dedicated server ZIP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              onDrop={handleFileDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                dragOver ? 'border-radix-500 bg-radix-500/5' : 'border-white/10 hover:border-white/20',
                selectedFile && 'border-radix-500/50 bg-radix-500/5',
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileSelect}
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-radix-400" />
                  <p className="text-sm text-radix-300 font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-400"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-slate-500" />
                  <p className="text-sm text-slate-300">
                    Drag & drop your <span className="font-mono text-radix-400">.zip</span> build here
                  </p>
                  <p className="text-xs text-slate-500">or click to browse</p>
                </div>
              )}
            </div>
            {errors.file && <p className="text-red-400 text-sm">{errors.file}</p>}

            <div className="space-y-2">
              <Label>Server Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                error={errors.name} placeholder="My Awesome Server" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Game Port *</Label>
                <Input type="number" value={form.port}
                  onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 0 })}
                  error={errors.port} />
              </div>
              <div className="space-y-2">
                <Label>Query Port *</Label>
                <Input type="number" value={form.queryPort}
                  onChange={(e) => setForm({ ...form, queryPort: parseInt(e.target.value) || 0 })}
                  error={errors.queryPort} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Players</Label>
                <Input type="number" value={form.maxPlayers}
                  onChange={(e) => setForm({ ...form, maxPlayers: parseInt(e.target.value) || 0 })}
                  error={errors.maxPlayers} />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                  <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password (optional)</Label>
              <Input type="password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Leave empty for no password" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="autoRestart" checked={form.autoRestart}
                onChange={(e) => setForm({ ...form, autoRestart: e.target.checked })}
                className="rounded border-slate-600" />
              <Label htmlFor="autoRestart">Enable auto-restart on crash</Label>
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleBack}>Back</Button>
              <Button type="button" onClick={handleNext}>Review & Deploy</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Deploy</CardTitle>
            <CardDescription>Confirm your server configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="bg-white/5 rounded-lg p-4 space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-radix-400" />
                  <span className="text-sm text-slate-300">Uploading &amp; extracting game files...</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-slate-500">{uploadProgress}%</p>
              </div>
            )}

            <div className="bg-white/5 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Engine</span>
                <span className="text-slate-200 font-medium capitalize">{form.engineType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Name</span>
                <span className="text-slate-200">{form.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Port / Query</span>
                <span className="text-slate-200">{form.port} / {form.queryPort}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Players</span>
                <span className="text-slate-200">{form.maxPlayers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Region</span>
                <span className="text-slate-200">{form.region || 'US East'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Build File</span>
                <span className="text-slate-200 text-sm truncate max-w-[200px]">{selectedFile?.name || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Auto-Restart</span>
                <span className="text-slate-200">{form.autoRestart ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300">
                The uploaded ZIP will be extracted and scanned for the server executable. 
                The server will be created in a <span className="font-mono">stopped</span> state, 
                ready for you to start.
              </p>
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleBack} disabled={loading}>Back</Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Deploying Server...</>
                ) : (
                  'Create & Deploy Server'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  );
}
