'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Server,
  Users,
  Shield,
  Ban,
  Package,
  ScrollText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useServerStore } from '@/stores/server-store';
import { StatusDot } from '@/components/ui/status-dot';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/servers', label: 'Servers', icon: Server },
  { href: '/players', label: 'Players', icon: Users },
  { href: '/admins', label: 'Admins', icon: Shield },
  { href: '/bans', label: 'Bans', icon: Ban },
  { href: '/logs', label: 'Logs', icon: ScrollText },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const servers = useServerStore((s) => s.servers);
  const onlineCount = servers.filter((s) => s.status === 'running').length;
  const totalCount = servers.length;

  const sidebarContent = (
      <div
        className={cn(
          'flex h-full flex-col bg-[#0B0A0F] border-r border-white/5 transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="/logov2.png"
              alt="Radix"
              width={32}
              height={32}
              className="rounded-lg"
            />
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-lg font-bold text-white neon-text"
              >
                Radix
              </motion.span>
            )}
          </Link>
          <button
            onClick={onToggle}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            onClick={onMobileClose}
            className="flex lg:hidden h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-radix-600/15 text-radix-400 border border-radix-500/20 neon-glow'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-radix-400')} />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={cn(
          'border-t border-white/5 p-4',
          collapsed && 'px-3'
        )}>
          <div className="flex items-center gap-3">
            <StatusDot status={onlineCount > 0 ? 'online' : 'offline'} size="sm" />
            {!collapsed && (
              <div className="text-xs text-slate-500">
                <span className="text-radix-400 font-medium">{onlineCount}</span>
                {' / '}
                <span>{totalCount}</span> servers online
              </div>
            )}
          </div>
        </div>
      </div>
  );

  return (
    <>
      <aside className="hidden lg:flex h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 lg:hidden"
            onClick={onMobileClose}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="h-full w-64"
              onClick={(e) => e.stopPropagation()}
            >
              {sidebarContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
