import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';
import { useServerStore } from '@/stores/server-store';
import { useNotificationStore } from '@/stores/notification-store';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = useAuthStore.getState().token;
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

  socket = io(wsUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('[WS] Connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[WS] Connection error:', error.message);
  });

  socket.on('server:status', (data: { serverId: string; status: string }) => {
    useServerStore.getState().updateServerStatus(data.serverId, data.status as any);
  });

  socket.on('metrics:update', (metric: any) => {
    useServerStore.getState().updateServerMetric(metric.serverId, metric);
  });

  socket.on('log:entry', (data: { serverId: string; level: string; message: string; timestamp: string }) => {
    useServerStore.getState().addServerLog(data.serverId, data);
  });

  socket.on('player_joined', (data: { serverId: string; player: any }) => {
    useServerStore.getState().addPlayer(data.serverId, data.player);
  });

  socket.on('player_left', (data: { serverId: string; playerId: string }) => {
    useServerStore.getState().removePlayer(data.serverId, data.playerId);
  });

  socket.on('command:ack', (data: { serverId: string; command: string; status: string; error?: string }) => {
    useServerStore.getState().addServerLog(data.serverId, {
      serverId: data.serverId,
      level: data.status === 'error' ? 'error' : 'info',
      message: data.status === 'error' ? `Command failed: ${data.error}` : `> ${data.command}`,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('notification', (notification: any) => {
    useNotificationStore.getState().addNotification(notification);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinServerRoom(serverId: string): void {
  socket?.emit('subscribe:server', serverId);
  socket?.emit('subscribe:logs', serverId);
  socket?.emit('subscribe:metrics', { serverId });
}

export function leaveServerRoom(serverId: string): void {
  socket?.emit('unsubscribe:server', serverId);
  socket?.emit('unsubscribe:logs', serverId);
  socket?.emit('unsubscribe:metrics', { serverId });
}

export function sendServerCommand(serverId: string, command: string): void {
  socket?.emit('server_command', { serverId, command });
}
