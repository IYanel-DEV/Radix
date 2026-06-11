'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { getApiError } from '@/lib/api';
import toast from 'react-hot-toast';

interface StaffUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: { id: string; name: string };
  isActive: boolean;
  lastLoginAt: string | null;
  lastActive: string | null;
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
}

export default function AdminsPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    username: '', email: '', password: '', displayName: '', roleId: '',
  });

  const fetchStaff = async () => {
    try {
      const res: any = await apiGet('/api/admin/users', { page: 1, limit: 100, search: search || undefined });
      setStaff(res.data?.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  const fetchRoles = async () => {
    try {
      const res: any = await apiGet('/api/roles');
      setRoles(res.data || []);
    } catch {}
  };

  useEffect(() => { fetchRoles(); fetchStaff(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost('/api/admin/users', form);
      toast.success('Staff account created');
      setShowCreate(false);
      setForm({ username: '', email: '', password: '', displayName: '', roleId: '' });
      fetchStaff();
    } catch (err) { toast.error(getApiError(err)); }
  };

  const handleUpdate = async (id: string) => {
    try {
      await apiPut(`/api/admin/users/${id}`, {
        displayName: form.displayName || undefined,
        roleId: form.roleId || undefined,
      });
      toast.success('User updated');
      setEditId(null);
      fetchStaff();
    } catch (err) { toast.error(getApiError(err)); }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/api/admin/users/${id}`);
      toast.success('User deleted');
      fetchStaff();
    } catch (err) { toast.error(getApiError(err)); }
  };

  const handleToggleStatus = async (id: string, current: boolean) => {
    try {
      await apiPut(`/api/admin/users/${id}/suspend`, { suspended: current });
      toast.success(current ? 'User suspended' : 'User reactivated');
      fetchStaff();
    } catch (err) { toast.error(getApiError(err)); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Staff Management" description="Manage administrative user accounts" />

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search staff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchStaff()}
          className="max-w-xs"
        />
        <Button onClick={() => { setShowCreate(!showCreate); setEditId(null); }}>
          {showCreate ? 'Cancel' : 'Add Staff'}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit">Create Staff</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16 text-slate-500">No staff members found</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-4 text-sm text-slate-400 font-medium">User</th>
                  <th className="text-left p-4 text-sm text-slate-400 font-medium">Email</th>
                  <th className="text-left p-4 text-sm text-slate-400 font-medium">Role</th>
                  <th className="text-left p-4 text-sm text-slate-400 font-medium">Status</th>
                  <th className="text-left p-4 text-sm text-slate-400 font-medium">Last Active</th>
                  <th className="text-right p-4 text-sm text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((user) => (
                  <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="p-4">
                      <p className="text-sm text-slate-200">{user.displayName}</p>
                      <p className="text-xs text-slate-500">@{user.username}</p>
                    </td>
                    <td className="p-4 text-sm text-slate-400">{user.email}</td>
                    <td className="p-4">
                      {editId === user.id ? (
                        <div className="flex gap-2">
                          <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {roles.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => handleUpdate(user.id)}>Save</Button>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-200">{user.role?.name || 'None'}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {user.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-400">
                      {user.lastActive ? format(new Date(user.lastActive), 'MMM d, yyyy HH:mm') : 'Never'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline"
                          onClick={() => {
                            setEditId(user.id);
                            setForm({ ...form, displayName: user.displayName, roleId: user.role?.id || '' });
                          }}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => handleToggleStatus(user.id, user.isActive)}>
                          {user.isActive ? 'Suspend' : 'Reactivate'}
                        </Button>
                        {user.username !== 'admin' && (
                          <Button size="sm" variant="outline"
                            className="text-red-400 border-red-800 hover:bg-red-900/20"
                            onClick={() => handleDelete(user.id, user.username)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
