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
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GameBaaSService } from './game-baas.service';

interface LobbyState {
  id: string;
  players: Map<string, { playerId: string; username: string; socketId: string }>;
  maxSlots: number;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/game-client',
})
export class PlayerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('PlayerGateway');
  private playerSockets: Map<string, { socketId: string; playerId: string; username: string }> = new Map();
  private lobbies: Map<string, LobbyState> = new Map();

  constructor(
    private jwtService: JwtService,
    private gameBaaSService: GameBaaSService,
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

      this.playerSockets.set(client.id, { socketId: client.id, playerId, username });
      await this.gameBaaSService.setPlayerOnline(playerId, true);

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
      await this.gameBaaSService.setPlayerOnline(playerData.playerId, false);
      this.playerSockets.delete(client.id);

      for (const [lobbyId, lobby] of this.lobbies.entries()) {
        if (lobby.players.has(client.id)) {
          lobby.players.delete(client.id);
          this.server.to(`lobby:${lobbyId}`).emit('lobby_updated', {
            lobbyId,
            players: Array.from(lobby.players.values()),
            count: lobby.players.size,
          });
        }
      }

      this.logger.log(`Player disconnected: ${playerData.username}`);
    }
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

  @SubscribeMessage('lobby_join')
  handleLobbyJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lobbyId: string; maxSlots?: number },
  ) {
    const player = this.playerSockets.get(client.id);
    if (!player) return;

    let lobby = this.lobbies.get(data.lobbyId);
    if (!lobby) {
      lobby = {
        id: data.lobbyId,
        players: new Map(),
        maxSlots: data.maxSlots || 10,
      };
      this.lobbies.set(data.lobbyId, lobby);
    }

    if (lobby.players.size >= lobby.maxSlots) {
      client.emit('lobby_error', { message: 'Lobby is full' });
      return;
    }

    lobby.players.set(client.id, {
      playerId: player.playerId,
      username: player.username,
      socketId: client.id,
    });

    client.join(`lobby:${data.lobbyId}`);

    client.emit('lobby_joined', {
      lobbyId: data.lobbyId,
      players: Array.from(lobby.players.values()),
    });

    client.to(`lobby:${data.lobbyId}`).emit('lobby_updated', {
      lobbyId: data.lobbyId,
      players: Array.from(lobby.players.values()),
      count: lobby.players.size,
    });

    this.logger.log(`Player ${player.username} joined lobby ${data.lobbyId}`);
  }

  @SubscribeMessage('lobby_leave')
  handleLobbyLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lobbyId: string },
  ) {
    const lobby = this.lobbies.get(data.lobbyId);
    if (!lobby) return;

    const player = lobby.players.get(client.id);
    if (!player) return;

    lobby.players.delete(client.id);
    client.leave(`lobby:${data.lobbyId}`);

    client.emit('lobby_left', { lobbyId: data.lobbyId });

    this.server.to(`lobby:${data.lobbyId}`).emit('lobby_updated', {
      lobbyId: data.lobbyId,
      players: Array.from(lobby.players.values()),
      count: lobby.players.size,
    });

    this.logger.log(`Player ${player.username} left lobby ${data.lobbyId}`);
  }

  @SubscribeMessage('lobby_chat')
  handleLobbyChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lobbyId: string; message: string },
  ) {
    const player = this.playerSockets.get(client.id);
    if (!player) return;

    this.server.to(`lobby:${data.lobbyId}`).emit('lobby_chat_received', {
      lobbyId: data.lobbyId,
      senderId: player.playerId,
      username: player.username,
      message: data.message,
      timestamp: new Date().toISOString(),
    });
  }
}