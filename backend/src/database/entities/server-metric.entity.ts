import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Server } from './server.entity';

@Entity('server_metrics')
export class ServerMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  serverId: string;

  @Column({ type: 'float' })
  cpuUsage: number;

  @Column({ type: 'float' })
  ramUsage: number;

  @Column({ type: 'bigint', default: 0 })
  networkIn: number;

  @Column({ type: 'bigint', default: 0 })
  networkOut: number;

  @Column({ type: 'int' })
  playerCount: number;

  @Column({ type: 'float' })
  tickRate: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @ManyToOne(() => Server, (server) => server.metrics)
  @JoinColumn({ name: 'serverId' })
  server: Server;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
