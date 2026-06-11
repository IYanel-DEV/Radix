import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ServersService } from '../modules/servers/servers.service';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', process.env.CORS_ORIGIN].filter(Boolean) as string[],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  namespace: '/ws',
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('WebSocketGateway');
  private connectedClients: Map<string, { socketId: string; userId: string; username: string }> = new Map();

  constructor(
    private jwtService: JwtService,
    @Inject(forwardRef(() => ServersService))
    private serversService: ServersService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || (client.handshake.query?.token as string);

      if (!token || typeof token !== 'string') {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      if (!payload || !payload.sub) {
        client.disconnect();
        return;
      }

      const userId = payload.sub;

      this.connectedClients.set(client.id, {
        socketId: client.id,
        userId,
        username: payload.username || 'unknown',
      });

      client.data.userId = userId;
      client.data.username = payload.username;

      const serverId = client.handshake.query?.serverId as string | undefined;
      if (serverId && typeof serverId === 'string') {
        client.join(`server:${serverId}`);
      }

      client.join(`user:${userId}`);

      client.emit('connected', {
        message: 'Connected to WebSocket',
        clientId: client.id,
      });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:server')
  handleSubscribeServer(client: Socket, serverId: string) {
    client.join(`server:${serverId}`);
    return { event: 'subscribed', data: { serverId } };
  }

  @SubscribeMessage('unsubscribe:server')
  handleUnsubscribeServer(client: Socket, serverId: string) {
    client.leave(`server:${serverId}`);
    return { event: 'unsubscribed', data: { serverId } };
  }

  @SubscribeMessage('subscribe:metrics')
  handleSubscribeMetrics(client: Socket, serverId: string) {
    client.join(`metrics:${serverId}`);
    return { event: 'subscribed', data: { serverId, type: 'metrics' } };
  }

  @SubscribeMessage('subscribe:logs')
  handleSubscribeLogs(client: Socket, serverId: string) {
    client.join(`logs:${serverId}`);
    return { event: 'subscribed', data: { serverId, type: 'logs' } };
  }

  @SubscribeMessage('server_command')
  async handleServerCommand(client: Socket, payload: { serverId: string; command: string }) {
    try {
      await this.serversService.executeCommand(payload.serverId, { command: payload.command });
      client.emit('command:ack', { serverId: payload.serverId, command: payload.command, status: 'sent' });
    } catch (err) {
      client.emit('command:ack', { serverId: payload.serverId, command: payload.command, status: 'error', error: err.message });
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    return { event: 'pong', data: { timestamp: new Date().toISOString() } };
  }

  sendServerStatus(serverId: string, status: any) {
    this.server.to(`server:${serverId}`).emit('server:status', status);
  }

  sendServerMetrics(serverId: string, metrics: any) {
    this.server.to(`metrics:${serverId}`).emit('metrics:update', metrics);
  }

  sendServerLog(serverId: string, logEntry: any) {
    this.server.to(`logs:${serverId}`).emit('log:entry', logEntry);
  }

  sendNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  broadcastNotification(notification: any) {
    this.server.emit('notification:broadcast', notification);
  }

  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  getClientsInRoom(room: string): number {
    const roomMap = this.server.sockets.adapter.rooms.get(room);
    return roomMap ? roomMap.size : 0;
  }
}
