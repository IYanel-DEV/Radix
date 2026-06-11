import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Server } from './server.entity';
import { Ban } from './ban.entity';
import { PlayerStat } from './player-stat.entity';

@Entity('players')
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  playerId: string;

  @Column({ type: 'varchar', length: 100 })
  username: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  firstSeen: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  lastSeen: Date;

  @Column({ type: 'int', default: 0 })
  totalKills: number;

  @Column({ type: 'int', default: 0 })
  totalDeaths: number;

  @Column({ type: 'int', default: 0 })
  totalPlaytime: number;

  @Column({ type: 'int', default: 0 })
  warnings: number;

  @Column({ type: 'boolean', default: false })
  isBanned: boolean;

  @Column({ type: 'uuid', nullable: true })
  serverId: string;

  @ManyToOne(() => Server, (server) => server.players)
  @JoinColumn({ name: 'serverId' })
  server: Server;

  @OneToMany(() => Ban, (ban) => ban.player)
  bans: Ban[];

  @OneToMany(() => PlayerStat, (stat) => stat.player)
  stats: PlayerStat[];

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
