import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Player } from './player.entity';

@Entity('player_stats')
export class PlayerStat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  playerId: string;

  @Column({ type: 'int', default: 0 })
  kills: number;

  @Column({ type: 'int', default: 0 })
  deaths: number;

  @Column({ type: 'int', default: 0 })
  assists: number;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'int', default: 0 })
  ping: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  team: string;

  @Column({ type: 'int', default: 0 })
  sessionLength: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  recordedAt: Date;

  @ManyToOne(() => Player, (player) => player.stats)
  @JoinColumn({ name: 'playerId' })
  player: Player;
}
