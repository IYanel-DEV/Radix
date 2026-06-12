import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { GamePlayer } from './game-player.entity';

export enum PulseStatus {
  OFFLINE = 'Offline',
  ONLINE = 'Online',
  IN_MATCH = 'In-Match',
  IN_MENU = 'In-Menu',
}

@Entity('player_pulses')
export class PlayerPulse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  playerId: string;

  @Column({ type: 'varchar', length: 20, default: PulseStatus.OFFLINE })
  status: PulseStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customActivity: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  currentHubId: string | null;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  @ManyToOne(() => GamePlayer)
  @JoinColumn({ name: 'playerId' })
  player: GamePlayer;
}