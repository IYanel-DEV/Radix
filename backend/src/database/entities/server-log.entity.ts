import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Server } from './server.entity';

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
}

@Entity('server_logs')
export class ServerLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  serverId: string;

  @Column({ type: 'varchar', enum: LogLevel, default: LogLevel.INFO })
  level: LogLevel;

  @Column({ type: 'text' })
  message: string;

  @ManyToOne(() => Server, (server) => server.logs)
  @JoinColumn({ name: 'serverId' })
  server: Server;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
