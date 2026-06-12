'use client';

import { Bell, Menu, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationDropdown } from './notification-dropdown';
import { UserDropdown } from './user-dropdown';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 bg-zinc-950/95 border-b border-zinc-800 px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-all duration-200"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden sm:flex relative flex-1 max-w-md group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 transition-colors duration-150 group-focus-within:text-violet-400" />
        <input
          type="text"
          placeholder="Search servers, players..."
          className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-all duration-200">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-radix-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-80 p-0 border-white/[0.06] bg-[#0D0C14]/95 backdrop-blur-2xl"
          >
            <NotificationDropdown />
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-white/[0.04] transition-all duration-200">
              <Avatar className="h-8 w-8 ring-2 ring-white/[0.04]">
                <AvatarFallback className="bg-radix-500/15 text-xs text-radix-400">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-slate-200 leading-tight">
                  {user?.username || 'User'}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {user?.role?.name || 'user'}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <UserDropdown />
        </DropdownMenu>
      </div>
    </header>
  );
}
