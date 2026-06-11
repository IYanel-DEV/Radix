'use client';

import { useRouter } from 'next/navigation';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth-store';
import { User, Settings, LogOut, Shield } from 'lucide-react';

export function UserDropdown() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel>
        <div className="flex flex-col">
          <span className="text-slate-100">{user?.username}</span>
          <span className="text-xs text-slate-500 font-normal">{user?.email}</span>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => router.push('/settings')}>
        <User className="mr-2 h-4 w-4" />
        Profile
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => router.push('/settings')}>
        <Settings className="mr-2 h-4 w-4" />
        Settings
      </DropdownMenuItem>
      {user?.role?.name === 'admin' && (
        <DropdownMenuItem onClick={() => router.push('/admins')}>
          <Shield className="mr-2 h-4 w-4" />
          Admin Panel
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400">
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
