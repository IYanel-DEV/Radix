import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GameBaaSService } from './game-baas.service';
import { PulseService } from './pulse.service';
import { hubManager, HubPlayerProfile } from './hub-manager';
import { PulseStatus } from '../../database/entities/player-pulse.entity';

interface QueuedEvent {
  actionType: string;
  payload: Record<string, any>;
  clientTimestamp: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/game-client',
})
export class PlayerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('PlayerGateway');
  private playerSockets: Map<string, { socketId: string; playerId: string; username: string; apiKeyId?: string }> = new Map();
  private socketToPlayer: Map<string, string> = new Map();

  constructor(
    private jwtService: JwtService,
    private gameBaaSService: GameBaaSService,
    private pulseService: PulseService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token as string);
      if (!payload || !payload.sub) {
        client.disconnect();
        return;
      }

      const playerId = payload.sub;
      const username = payload.username || 'unknown';
      const apiKeyId = (client.handshake.auth?.apiKeyId || client.handshake.query?.apiKeyId) as string | undefined;

      this.playerSockets.set(client.id, { socketId: client.id, playerId, username, apiKeyId });
      this.socketToPlayer.set(client.id, playerId);
      await this.gameBaaSService.setPlayerOnline(playerId, true);
      await this.pulseService.setOnline(playerId);

      client.emit('connected', {
        message: 'Connected to game server',
        playerId,
        username,
      });

      this.logger.log(`Player connected: ${username} (${playerId})`);
    } catch (err) {
      this.logger.error(`Connection failed: ${err.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const playerData = this.playerSockets.get(client.id);
    if (playerData) {
      const { playerId, username } = playerData;

      const hubId = hubManager.getPlayerHub(playerId);
      if (hubId) {
        hubManager.leaveHub(hubId, playerId);
        this.server.to(`hub:${hubId}`).emit('hub_updated', {
          hubId,
          players: hubManager.getHubPlayers(hubId),
          count: hubManager.getHubPlayers(hubId).length,
        });
      }

      await this.gameBaaSService.setPlayerOnline(playerId, false);
      await this.pulseService.setOffline(playerId);
      this.playerSockets.delete(client.id);
      this.socketToPlayer.delete(client.id);

      this.broadcastToFriends(playerId, 'friend_pulse_changed', {
        playerId,
        username,
        status: PulseStatus.OFFLINE,
        customActivity: null,
      });

      this.logger.log(`Player disconnected: ${username}`);
    }
  }

  private async broadcastToFriends(playerId: string, event: string, data: any) {
    const onlineFriends = await this.pulseService.getOnlineFriends(playerId);
    for (const friendId of onlineFriends) {
      for (const [socketId, pData] of this.playerSockets) {
        if (pData.playerId === friendId) {
          this.server.to(socketId).emit(event, data);
        }
      }
    }
  }

  disconnectByKeyId(keyId: string): number {
    let count = 0;
    const disconnected: string[] = [];
    for (const [socketId, data] of this.playerSockets) {
      if (data.apiKeyId === keyId) {
        const client = this.server.sockets.sockets.get(socketId);
        if (client) {
          client.disconnect(true);
          disconnected.push(socketId);
          count++;
        }
      }
    }
    if (count > 0) {
      this.logger.warn(`Revoked key ${keyId}: forcefully disconnected ${count} active connection(s)`);
    }
    return count;
  }

  @SubscribeMessage('send_global_chat')
  handleGlobalChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message: string },
  ) {
    const player = this.playerSockets.get(client.id);
    if (!player) return;

    this.server.emit('chat_message_received', {
      senderId: player.playerId,
      username: player.username,
      message: data.message,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('pulse_update')
  async handlePulseUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { status: PulseStatus; customActivity?: string },
  ) {
    const player = this.playerSockets.get(client.id);
    if (!player) return;

    const hubId = hubManager.getPlayerHub(player.playerId);

    await this.pulseService.updateStatus(
      player.playerId,
      data.status,
      data.customActivity,
      hubId || undefined,
    );

    const payload = {
      playerId: player.playerId,
      username: player.username,
      status: data.status,
      customActivity: data.customActivity || null,
    };

    client.emit('pulse_self_confirmed', payload);
    this.broadcastToFriends(player.playerId, 'friend_pulse_changed', payload);
  }

  @SubscribeMessage('hub_create')
  handleHubCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { hubId: string; name: string; type?: string; maxSlots?: number },
  ) {
    const player = this.playerSockets.get(client.id);
    if (!player) return;

    try {
      const hub = hubManager.createHub(
        data.hubId,
        data.name,
        (data.type as any) || 'room',
        data.maxSlots || 10,
      );

      const profile: HubPlayerProfile = {
        playerId: player.playerId,
        username: player.username,
        socketId: client.id,
        joinedAt: new Date(),
      };
      hubManager.joinHub(data.hubId, profile);
      client.join(`hub:${data.hubId}`);

      client.emit('hub_created', {
        hubId: hub.id,
        name: hub.name,
        type: hub.type,
        maxSlots: hub.maxSlots,
        players: hubManager.getHubPlayers(data.hubId),
      });
    } catch (err: any) {
      client.emit('hub_error', { message: err.message });
    }
  }

  @SubscribeMessage('hub_join')
  handleHubJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { hubId: string; maxSlots?: number },
  ) {
    const player = this.playerSockets.get(client.id);
    if (!player) return;

    let hub = hubManager.getHub(data.hubId);

    if (!hub) {
      hub = hubManager.createHub(data.hubId, data.hubId, 'room', data.maxSlots || 10);
    }

    const profile: HubPlayerProfile = {
      playerId: player.playerId,
      username: player.username,
      socketId: client.id,
      joinedAt: new Date(),
    };

    try {
      hubManager.joinHub(data.hubId, profile);
      client.join(`hub:${data.hubId}`);

      client.emit('hub_joined', {
        hubId: data.hubId,
        players: hubManager.getHubPlayers(data.hubId),
        customData: hub.customData,
      });

      (client as any).to(`hub:${data.hubId}`).emit('hub_updated', {
        hubId: data.hubId,
        players: hubManager.getHubPlayers(data.hubId),
        count: hubManager.getHubPlayers(data.hubId).length,
      });

      this.pulseService.updateStatus(player.playerId, PulseStatus.ONLINE, undefined, data.hubId);
    } catch (err: any) {
      client.emit('hub_error', { message: err.message });
    }
  }

  @SubscribeMessage('hub_leave')
  async handleHubLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { hubId: string }) {
    const player = this.playerSockets.get(client.id);
    if (!player) return;

    const updatedHub = hubManager.leaveHub(data.hubId, player.playerId);
    client.leave(`hub:${data.hubId}`);

    client.emit('hub_left', { hubId: data.hubId });

    if (updatedHub) {
      this.server.to(`hub:${data.hubId}`).emit('hub_updated', {
        hubId: data.hubId,
        players: hubManager.getHubPlayers(data.hubId),
        count: updatedHub.players.size,
      });
    }

    await this.pulseService.updateStatus(player.playerId, PulseStatus.ONLINE);
  }

  @SubscribeMessage('hub_update_state')
  handleHubUpdateState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { hubId: string; customData: Record<string, any> },
  ) {
    const player = this.playerSockets.get(client.id);
    if (!player) return;

    const hubId = data.hubId;

    const updatedHub = hubManager.updateHubState(hubId, data.customData);
    if (updatedHub) {
      this.server.to(`hub:${hubId}`).emit('hub_state_updated', {
        hubId,
        customData: updatedHub.customData,
        updatedAt: updatedHub.updatedAt,
      });
    }
  }

  @SubscribeMessage('hub_chat')
  handleHubChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { hubId: string; message: string },
  ) {
    const player = this.playerSockets.get(client.id);
    if (!player) return;

    this.server.to(`hub:${data.hubId}`).emit('hub_chat_received', {
      hubId: data.hubId,
      senderId: player.playerId,
      username: player.username,
      message: data.message,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('events_sync')
  async handleEventsSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { events: QueuedEvent[] },
  ) {
    const player = this.playerSockets.get(client.id);
    if (!player) return;

    const results: { index: number; success: boolean; error?: string }[] = [];

    for (let i = 0; i < data.events.length; i++) {
      const event = data.events[i];
      try {
        await this.processPlayerEvent(player.playerId, event, i);
        results.push({ index: i, success: true });
      } catch (err: any) {
        results.push({ index: i, success: false, error: err.message });
      }
    }

    client.emit('events_sync_result', { results });
  }

  private async processPlayerEvent(
    playerId: string,
    event: QueuedEvent,
    order: number,
  ): Promise<void> {
    switch (event.actionType) {
      case 'match_end':
      case 'match_start':
      case 'stat_update':
      case 'achievement_unlock':
      case 'level_up':
        this.logger.log(`Processing event ${event.actionType} for player ${playerId}`);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event.actionType}`);
    }
  }
}