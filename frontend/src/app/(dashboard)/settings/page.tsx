'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    notifications: {
      emailAlerts: true,
      serverStatus: true,
      playerEvents: false,
      weeklyReport: true,
    },
  });

  const handleSaveProfile = () => {
    toast.success('Profile updated');
  };

  const handleChangePassword = () => {
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    toast.success('Password changed');
  };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account settings"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-slate-800 text-xl">
                {form.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm">
                Change Avatar
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={handleChangePassword}>Change Password</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Alerts</Label>
              <p className="text-xs text-slate-500">Receive email notifications for important events</p>
            </div>
            <Switch
              checked={form.notifications.emailAlerts}
              onCheckedChange={(checked) =>
                setForm({ ...form, notifications: { ...form.notifications, emailAlerts: checked } })
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Server Status Changes</Label>
              <p className="text-xs text-slate-500">Get notified when servers go online/offline</p>
            </div>
            <Switch
              checked={form.notifications.serverStatus}
              onCheckedChange={(checked) =>
                setForm({ ...form, notifications: { ...form.notifications, serverStatus: checked } })
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Player Events</Label>
              <p className="text-xs text-slate-500">Player join/leave notifications</p>
            </div>
            <Switch
              checked={form.notifications.playerEvents}
              onCheckedChange={(checked) =>
                setForm({ ...form, notifications: { ...form.notifications, playerEvents: checked } })
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Weekly Report</Label>
              <p className="text-xs text-slate-500">Receive weekly server performance report</p>
            </div>
            <Switch
              checked={form.notifications.weeklyReport}
              onCheckedChange={(checked) =>
                setForm({ ...form, notifications: { ...form.notifications, weeklyReport: checked } })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
