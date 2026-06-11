'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export function useRealtime() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initialized = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !initialized.current) {
      initialized.current = true;
      connectSocket();
    }

    if (!isAuthenticated && initialized.current) {
      initialized.current = false;
      disconnectSocket();
    }

    return () => {
      if (initialized.current) {
        disconnectSocket();
        initialized.current = false;
      }
    };
  }, [isAuthenticated]);
}
