'use client';

import { useRouter } from 'next/navigation';
import { Plus, ScrollText, RefreshCw, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const actions = [
  { label: 'Create Server', icon: Plus, href: '/servers/create', color: 'text-radix-400' },
  { label: 'View Logs', icon: ScrollText, href: '/logs', color: 'text-blue-400' },
  { label: 'Analytics', icon: BarChart3, href: '/analytics', color: 'text-purple-400' },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="outline"
                className="flex items-center gap-2 h-auto py-3 justify-start border-white/10 hover:border-white/20 hover:bg-white/5"
                onClick={() => router.push(action.href)}
              >
                <Icon className={`h-4 w-4 ${action.color}`} />
                <span className="text-sm">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
