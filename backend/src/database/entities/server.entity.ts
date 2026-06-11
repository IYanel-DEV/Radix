import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ServerBuild } from './server-build.entity';
import { ServerMetric } from './server-metric.entity';
import { Backup } from './backup.entity';
import { Player } from './player.entity';
import { ServerLog } from './server-log.entity';

export enum ServerStatus {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  CRASHED = 'crashed',
  UPDATING = 'updating',
  STOPPED_BY_WATCHDOG = 'stopped_by_watchdog',
}

export enum EngineType {
  GODOT = 'godot',
  UNREAL = 'unreal',
  UNITY = 'unity',
}

@Entity('servers')
export class Server {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, default: 'DefaultMap' })
  map: string;

  @Column({ type: 'varchar', length: 100, default: 'DefaultGameMode' })
  gameMode: string;

  @Column({ type: 'int', default: 100 })
  maxPlayers: number;

  @Column({ type: 'int', unique: true })
  port: number;

  @Column({ type: 'int', unique: true })
  queryPort: number;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 50, default: 'godot' })
  engineType: string;

  @Column({ type: 'varchar', length: 50 })
  buildVersion: string;

  @Column({ type: 'varchar', length: 100, default: 'US East' })
  region: string;

  @Column({ type: 'varchar', enum: ServerStatus, default: ServerStatus.STOPPED })
  status: ServerStatus;

  @Column({ type: 'float', default: 0 })
  cpuUsage: number;

  @Column({ type: 'float', default: 0 })
  ramUsage: number;

  @Column({ type: 'int', default: 0 })
  uptime: number;

  @Column({ type: 'int', default: 0 })
  playerCount: number;

  @Column({ type: 'float', default: 60 })
  tickRate: number;

  @Column({ type: 'int', nullable: true })
  processId: number | null;

  @Column({ type: 'boolean', default: false })
  autoRestart: boolean;

  @Column({ type: 'int', default: 0 })
  maxCpuLimit: number;

  @Column({ type: 'int', default: 0 })
  maxMemoryLimit: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  serverTokenHash: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastS2sAt: Date | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  lastS2sIp: string | null;

  @Column({ type: 'text', nullable: true })
  startupCommand: string;

  @Column({ type: 'varchar', length: 500 })
  serverDirectory: string;

  @Column({ type: 'varchar', length: 500 })
  executablePath: string;

  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ type: 'uuid', nullable: true })
  buildId: string;

  @ManyToOne(() => User, (user) => user.servers)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @ManyToOne(() => ServerBuild, (build) => build.servers)
  @JoinColumn({ name: 'buildId' })
  build: ServerBuild;

  @OneToMany(() => ServerMetric, (metric) => metric.server)
  metrics: ServerMetric[];

  @OneToMany(() => Backup, (backup) => backup.server)
  backups: Backup[];

  @OneToMany(() => Player, (player) => player.server)
  players: Player[];

  @OneToMany(() => ServerLog, (log) => log.server)
  logs: ServerLog[];

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
