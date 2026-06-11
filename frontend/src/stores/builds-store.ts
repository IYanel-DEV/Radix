import { create } from 'zustand';
import type { ServerBuild } from '@/types';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import api from '@/lib/api';
import { getApiError } from '@/lib/api';

interface BuildsState {
  builds: ServerBuild[];
  loading: boolean;
  uploading: boolean;
  uploadProgress: number;
  error: string | null;
  fetchBuilds: (engineType?: string) => Promise<void>;
  uploadBuild: (file: File, engineType: string) => Promise<ServerBuild>;
  deleteBuild: (id: string) => Promise<void>;
  deployBuild: (buildId: string) => Promise<any>;
  clearError: () => void;
}

export const useBuildsStore = create<BuildsState>()((set, get) => ({
  builds: [],
  loading: false,
  uploading: false,
  uploadProgress: 0,
  error: null,

  fetchBuilds: async (engineType) => {
    set({ loading: true, error: null });
    try {
      const params: Record<string, unknown> = {};
      if (engineType) params.engineType = engineType;
      const res: any = await apiGet('/api/uploads/builds', params);
      const list = res?.data ?? res;
      set({ builds: Array.isArray(list) ? list : (list?.data ?? []), loading: false });
    } catch (err) {
      set({ error: getApiError(err), loading: false });
    }
  },

  uploadBuild: async (file, engineType) => {
    set({ uploading: true, uploadProgress: 0, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('engineType', engineType);

      const response = await api.post('/api/uploads/build', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            set({ uploadProgress: pct });
          }
        },
      });

      const build = (response.data?.data ?? response.data) as ServerBuild;
      set({ uploading: false, uploadProgress: 100 });
      return build;
    } catch (err) {
      set({ uploading: false, uploadProgress: 0 });
      throw new Error(getApiError(err));
    }
  },

  deleteBuild: async (id) => {
    set({ error: null });
    try {
      await apiDelete(`/api/uploads/builds/${id}`);
      set({ builds: get().builds.filter((b) => b.id !== id) });
    } catch (err) {
      set({ error: getApiError(err) });
      throw err;
    }
  },

  deployBuild: async (buildId) => {
    set({ error: null });
    try {
      const res: any = await apiPost(`/api/uploads/build/${buildId}/deploy`);
      return res?.data ?? res;
    } catch (err) {
      set({ error: getApiError(err) });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
