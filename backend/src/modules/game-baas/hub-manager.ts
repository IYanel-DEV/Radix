import { PulseStatus } from '../../database/entities/player-pulse.entity';

export interface HubPlayerProfile {
  playerId: string;
  username: string;
  socketId: string;
  joinedAt: Date;
}

export interface HubState {
  id: string;
  name: string;
  type: 'lobby' | 'party' | 'room' | 'match';
  players: Map<string, HubPlayerProfile>;
  customData: Record<string, any>;
  maxSlots: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class HubManager {
  private hubs: Map<string, HubState> = new Map();
  private playerHubs: Map<string, string> = new Map();

  createHub(
    id: string,
    name: string,
    type: HubState['type'] = 'room',
    maxSlots: number = 10,
    isPublic: boolean = true,
  ): HubState {
    if (this.hubs.has(id)) {
      throw new Error(`Hub "${id}" already exists`);
    }

    const hub: HubState = {
      id,
      name,
      type,
      players: new Map(),
      customData: {},
      maxSlots,
      isPublic,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.hubs.set(id, hub);
    return hub;
  }

  getHub(id: string): HubState | undefined {
    return this.hubs.get(id);
  }

  getAllHubs(): HubState[] {
    return Array.from(this.hubs.values());
  }

  deleteHub(id: string): void {
    const hub = this.hubs.get(id);
    if (hub) {
      for (const player of hub.players.values()) {
        this.playerHubs.delete(player.playerId);
      }
      this.hubs.delete(id);
    }
  }

  joinHub(hubId: string, player: HubPlayerProfile): HubState | null {
    const hub = this.hubs.get(hubId);
    if (!hub) return null;

    if (hub.players.size >= hub.maxSlots) {
      throw new Error('Hub is full');
    }

    const existingHubId = this.playerHubs.get(player.playerId);
    if (existingHubId) {
      this.leaveHub(existingHubId, player.playerId);
    }

    hub.players.set(player.socketId, player);
    this.playerHubs.set(player.playerId, hubId);
    hub.updatedAt = new Date();

    return hub;
  }

  leaveHub(hubId: string, playerId: string): HubState | null {
    const hub = this.hubs.get(hubId);
    if (!hub) return null;

    let playerKeyToRemove: string | null = null;
    for (const [socketId, profile] of hub.players) {
      if (profile.playerId === playerId) {
        playerKeyToRemove = socketId;
        break;
      }
    }

    if (playerKeyToRemove) {
      hub.players.delete(playerKeyToRemove);
      this.playerHubs.delete(playerId);
      hub.updatedAt = new Date();
    }

    if (hub.players.size === 0) {
      this.hubs.delete(hubId);
      return null;
    }

    return hub;
  }

  updateHubState(hubId: string, customData: Record<string, any>): HubState | null {
    const hub = this.hubs.get(hubId);
    if (!hub) return null;

    hub.customData = { ...hub.customData, ...customData };
    hub.updatedAt = new Date();
    return hub;
  }

  getPlayerHub(playerId: string): string | null {
    return this.playerHubs.get(playerId) || null;
  }

  getHubPlayers(hubId: string): HubPlayerProfile[] {
    const hub = this.hubs.get(hubId);
    return hub ? Array.from(hub.players.values()) : [];
  }
}

export const hubManager = new HubManager();