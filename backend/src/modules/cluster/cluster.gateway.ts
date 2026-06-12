import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as http from 'http';
import * as WebSocket from 'ws';
import { ClusterService } from './cluster.service';

@Injectable()
export class ClusterGateway implements OnApplicationBootstrap {
  private readonly logger = new Logger('ClusterGateway');
  private wss: WebSocket.Server | null = null;

  constructor(
    private readonly clusterService: ClusterService,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  onApplicationBootstrap(): void {
    const httpAdapter = this.httpAdapterHost.httpAdapter;
    const server: http.Server = httpAdapter.getHttpServer();

    this.wss = new WebSocket.Server({ noServer: true });

    server.on('upgrade', (request: http.IncomingMessage, socket: any, head: Buffer) => {
      const url = request.url || '';

      if (url === '/api/v1/cluster/nodes') {
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          this.wss!.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    this.logger.log('Cluster WebSocket gateway ready at /api/v1/cluster/nodes');
  }

  private handleConnection(ws: WebSocket, req: http.IncomingMessage): void {
    const nodeId = req.headers['x-node-id'] as string | undefined;
    const nodeToken = req.headers['x-node-token'] as string | undefined;

    if (!nodeId || !nodeToken) {
      this.logger.warn('Connection rejected: missing x-node-id or x-node-token');
      ws.close(4001, 'Missing authentication headers');
      return;
    }

    const expectedSecret = process.env.RADIX_NODE_SECRET || '';
    if (!expectedSecret || nodeToken !== expectedSecret) {
      this.logger.warn(`Connection rejected: invalid token from node ${nodeId}`);
      ws.close(4001, 'Invalid node token');
      return;
    }

    this.clusterService.registerNode(nodeId, ws);
    this.logger.log(`Node agent connected: ${nodeId}`);

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        this.handleMessage(nodeId, msg);
      } catch {
        this.logger.warn(`Malformed message from node ${nodeId}`);
      }
    });

    ws.on('close', () => {
      this.logger.log(`Node agent disconnected: ${nodeId}`);
      this.clusterService.unregisterNode(nodeId);
    });

    ws.on('error', (err) => {
      this.logger.error(`WebSocket error for node ${nodeId}: ${err.message}`);
      this.clusterService.unregisterNode(nodeId);
    });

    ws.send(JSON.stringify({ action: 'connected', payload: { nodeId } }));
  }

  private handleMessage(nodeId: string, msg: { action: string; payload?: any }): void {
    switch (msg.action) {
      case 'node_connected':
        this.logger.log(`Node ${nodeId} acknowledged connection`);
        break;
      case 'node_heartbeat':
        this.clusterService.updateHeartbeat(nodeId);
        break;
      case 'container_status_change':
        this.logger.log(`Container status from ${nodeId}: ${JSON.stringify(msg.payload)}`);
        break;
      case 'container_log':
        break;
      default:
        this.logger.debug(`Unknown message from ${nodeId}: ${msg.action}`);
    }
  }
}
