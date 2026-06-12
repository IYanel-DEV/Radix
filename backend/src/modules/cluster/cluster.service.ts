import { Injectable, Logger } from '@nestjs/common';
import * as WebSocket from 'ws';

export interface SpawnCommandPayload {
  serverId: string;
  engine: string;
  port: number;
  token: string;
  buildUrl: string;
  executableName: string;
  envVariables: Record<string, string>;
}

export interface NodeInfo {
  nodeId: string;
  socket: WebSocket;
  connectedAt: Date;
  lastHeartbeat: Date;
}

@Injectable()
export class ClusterService {
  private readonly logger = new Logger('ClusterService');
  private readonly nodes = new Map<string, NodeInfo>();

  registerNode(nodeId: string, socket: WebSocket): void {
    this.nodes.set(nodeId, {
      nodeId,
      socket,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    });
    this.logger.log(`Node registered: ${nodeId} (total: ${this.nodes.size})`);
  }

  unregisterNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.logger.log(`Node unregistered: ${nodeId} (total: ${this.nodes.size})`);
  }

  updateHeartbeat(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.lastHeartbeat = new Date();
    }
  }

  getNode(nodeId: string): NodeInfo | undefined {
    return this.nodes.get(nodeId);
  }

  getConnectedNodes(): NodeInfo[] {
    return Array.from(this.nodes.values());
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  sendSpawnCommand(nodeId: string, payload: SpawnCommandPayload): boolean {
    const node = this.nodes.get(nodeId);
    if (!node || node.socket.readyState !== WebSocket.OPEN) {
      this.logger.warn(`Node ${nodeId} not available for spawn`);
      return false;
    }

    const message = JSON.stringify({
      action: 'spawn_container',
      payload: {
        serverId: payload.serverId,
        engine: payload.engine,
        port: payload.port,
        token: payload.token,
        buildUrl: payload.buildUrl,
        executableName: payload.executableName,
        envVariables: payload.envVariables,
      },
    });

    node.socket.send(message);
    this.logger.log(`spawn_container sent to node ${nodeId} for server ${payload.serverId}`);
    return true;
  }

  sendStopCommand(nodeId: string, serverId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node || node.socket.readyState !== WebSocket.OPEN) {
      this.logger.warn(`Node ${nodeId} not available for stop`);
      return false;
    }

    const message = JSON.stringify({
      action: 'stop_container',
      payload: { serverId },
    });

    node.socket.send(message);
    this.logger.log(`stop_container sent to node ${nodeId} for server ${serverId}`);
    return true;
  }
}
