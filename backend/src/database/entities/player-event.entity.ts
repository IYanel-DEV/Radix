import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { GamePlayer } from './game-player.entity';

@Entity('player_events')
export class PlayerEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  playerId: string;

  @Column({ type: 'varchar', length: 100 })
  actionType: string;

  @Column({ type: 'simple-json' })
  payload: Record<string, any>;

  @Column({ type: 'datetime' })
  clientTimestamp: Date;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  syncStatus: string;

  @Column({ type: 'int', default: 0 })
  processedOrder: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => GamePlayer)
  @JoinColumn({ name: 'playerId' })
  player: GamePlayer;
}