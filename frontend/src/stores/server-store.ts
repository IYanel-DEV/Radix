import { create } from 'zustand';
import type { Server, ServerMetric, Player } from '@/types';
import api, { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

interface ServerLogEntry {
  serverId: string;
  level: string;
  message: string;
  timestamp: string;
}

interface ServerState {
  servers: Server[];
  currentServer: Server | null;
  loading: boolean;
  error: string | null;
  serverLogs: Record<string, ServerLogEntry[]>;
  serverMetrics: Record<string, ServerMetric[]>;
  fetchServers: (params?: Record<string, unknown>) => Promise<void>;
  fetchServer: (id: string) => Promise<void>;
  createServer: (data: Partial<Server>) => Promise<Server>;
  createServerWithZip: (formData: FormData, onProgress?: (pct: number) => void) => Promise<Server>;
  updateServer: (id: string, data: Partial<Server>) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  startServer: (id: string) => Promise<void>;
  stopServer: (id: string) => Promise<void>;
  restartServer: (id: string) => Promise<void>;
  killServer: (id: string) => Promise<void>;
  updateServerStatus: (id: string, status: Server['status']) => void;
  updateServerMetric: (id: string, metric: ServerMetric) => void;
  addServerLog: (serverId: string, log: ServerLogEntry) => void;
  addPlayer: (serverId: string, player: Player) => void;
  removePlayer: (serverId: string, playerId: string) => void;
  clearServerLogs: (serverId: string) => void;
  setCurrentServer: (server: Server | null) => void;
  clearError: () => void;
}

export const useServerStore = create<ServerState>()((set, get) => ({
  servers: [],
  currentServer: null,
  loading: false,
  error: null,
  serverLogs: {},
  serverMetrics: {},

  fetchServers: async (params) => {
    set({ loading: true, error: null });
    try {
      const res: any = await apiGet('/api/servers', params);
      const list = res?.data ?? res;
      set({ servers: Array.isArray(list) ? list : (list?.data ?? []), loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchServer: async (id) => {
    set({ loading: true, error: null });
    try {
      const res: any = await apiGet(`/api/servers/${id}`);
      set({ currentServer: res?.data ?? res, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createServer: async (data) => {
    set({ loading: true, error: null });
    try {
      const res: any = await apiPost('/api/servers', data);
      const server: Server = res?.data ?? res;
      set((state) => ({ servers: [...state.servers, server], loading: false }));
      return server;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  createServerWithZip: async (formData, onProgress) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/api/servers/create-with-zip', formData, {
        headers: { 'Content-Type': undefined as unknown as string },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });
      const server: Server = (response.data?.data ?? response.data) as Server;
      set((state) => ({ servers: [...state.servers, server], loading: false }));
      return server;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateServer: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res: any = await apiPut(`/api/servers/${id}`, data);
      const updated: Server = res?.data ?? res;
      set((state) => ({
        servers: state.servers.map((s) => (s.id === id ? updated : s)),
        currentServer: state.currentServer?.id === id ? updated : state.currentServer,
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  deleteServer: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiDelete(`/api/servers/${id}`);
      set((state) => ({
        servers: state.servers.filter((s) => s.id !== id),
        currentServer: state.currentServer?.id === id ? null : state.currentServer,
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  startServer: async (id) => {
    try {
      await apiPost(`/api/servers/${id}/start`);
      set((state) => ({
        servers: state.servers.map((s) =>
          s.id === id ? { ...s, status: 'starting' as const } : s
        ),
        currentServer:
          state.currentServer?.id === id
            ? { ...state.currentServer, status: 'starting' as const }
            : state.currentServer,
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  stopServer: async (id) => {
    try {
      await apiPost(`/api/servers/${id}/stop`);
      set((state) => ({
        servers: state.servers.map((s) =>
          s.id === id ? { ...s, status: 'stopping' as const } : s
        ),
        currentServer:
          state.currentServer?.id === id
            ? { ...state.currentServer, status: 'stopping' as const }
            : state.currentServer,
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  restartServer: async (id) => {
    try {
      await apiPost(`/api/servers/${id}/restart`);
      set((state) => ({
        servers: state.servers.map((s) =>
          s.id === id ? { ...s, status: 'starting' as const } : s
        ),
        currentServer:
          state.currentServer?.id === id
            ? { ...state.currentServer, status: 'starting' as const }
            : state.currentServer,
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  killServer: async (id) => {
    try {
      await apiPost(`/api/servers/${id}/kill`);
      set((state) => ({
        servers: state.servers.map((s) =>
          s.id === id ? { ...s, status: 'stopped' as const } : s
        ),
        currentServer:
          state.currentServer?.id === id
            ? { ...state.currentServer, status: 'stopped' as const }
            : state.currentServer,
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  updateServerStatus: (id, status) => {
    set((state) => ({
      servers: state.servers.map((s) => (s.id === id ? { ...s, status } : s)),
      currentServer:
        state.currentServer?.id === id
          ? { ...state.currentServer, status }
          : state.currentServer,
    }));
  },

  updateServerMetric: (id, metric) => {
    set((state) => {
      const metrics = state.serverMetrics[id] || [];
      const updated = [...metrics, metric].slice(-120);
      return {
        serverMetrics: { ...state.serverMetrics, [id]: updated },
        servers: state.servers.map((s) =>
          s.id === id
            ? {
                ...s,
                cpuUsage: metric.cpuUsage,
                ramUsage: metric.ramUsage,
                tickRate: metric.tickRate,
                playerCount: metric.playerCount,
              }
            : s
        ),
        currentServer:
          state.currentServer?.id === id
            ? {
                ...state.currentServer,
                cpuUsage: metric.cpuUsage,
                ramUsage: metric.ramUsage,
                tickRate: metric.tickRate,
                playerCount: metric.playerCount,
              }
            : state.currentServer,
      };
    });
  },

  addServerLog: (serverId, log) => {
    set((state) => {
      const logs = state.serverLogs[serverId] || [];
      const updated = [...logs, log].slice(-1000);
      return {
        serverLogs: { ...state.serverLogs, [serverId]: updated },
      };
    });
  },

  addPlayer: (serverId, player) => {
    set((state) => ({
      servers: state.servers.map((s) =>
        s.id === serverId
          ? {
              ...s,
              playerCount: (s.playerCount || 0) + 1,
              players: [...(s.players || []).filter((p) => p.id !== player.id), player],
            }
          : s
      ),
      currentServer:
        state.currentServer?.id === serverId && state.currentServer.players
          ? {
              ...state.currentServer,
              playerCount: (state.currentServer.playerCount || 0) + 1,
              players: [
                ...state.currentServer.players.filter((p) => p.id !== player.id),
                player,
              ],
            }
          : state.currentServer,
    }));
  },

  removePlayer: (serverId, playerId) => {
    set((state) => ({
      servers: state.servers.map((s) =>
        s.id === serverId
          ? {
              ...s,
              playerCount: Math.max(0, (s.playerCount || 0) - 1),
              players: (s.players || []).filter((p) => p.id !== playerId),
            }
          : s
      ),
      currentServer:
        state.currentServer?.id === serverId && state.currentServer.players
          ? {
              ...state.currentServer,
              playerCount: Math.max(
                0,
                (state.currentServer.playerCount || 0) - 1
              ),
              players: state.currentServer.players.filter((p) => p.id !== playerId),
            }
          : state.currentServer,
    }));
  },

  clearServerLogs: (serverId) => {
    set((state) => {
      const logs = { ...state.serverLogs };
      delete logs[serverId];
      return { serverLogs: logs };
    });
  },

  setCurrentServer: (server) => set({ currentServer: server }),

  clearError: () => set({ error: null }),
}));
