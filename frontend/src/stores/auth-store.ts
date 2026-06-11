import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { setAuthCookie, clearAuthCookie } from '@/lib/auth-cookie';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  refresh: (token: string, refreshToken: string) => void;
  updateProfile: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (user, token, refreshToken) => {
        setAuthCookie(token);
        return set({ user, token, refreshToken, isAuthenticated: true });
      },
      logout: () => {
        clearAuthCookie();
        return set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },
      refresh: (token, refreshToken) => {
        setAuthCookie(token);
        return set({ token, refreshToken });
      },
      updateProfile: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
