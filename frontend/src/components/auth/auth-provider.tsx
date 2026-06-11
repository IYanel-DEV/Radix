'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (publicPaths.includes(pathname)) {
      setChecking(false);
      return;
    }

    if (!isAuthenticated || !token) {
      router.push('/login');
    } else {
      setChecking(false);
    }
  }, [isAuthenticated, token, pathname, router]);

  if (checking && !publicPaths.includes(pathname)) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0B0A0F]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-400">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
