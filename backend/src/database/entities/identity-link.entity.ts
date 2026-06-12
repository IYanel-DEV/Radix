import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { GamePlayer } from './game-player.entity';

export enum Platform {
  ANONYMOUS = 'anonymous',
  STEAM = 'steam',
  EPIC = 'epic',
  DISCORD = 'discord',
  XBOX = 'xbox',
  PLAYSTATION = 'playstation',
  NINTENDO = 'nintendo',
}

@Entity('identity_links')
export class IdentityLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  platform: Platform;

  @Column({ type: 'varchar', length: 255 })
  platformId: string;

  @Column({ type: 'uuid' })
  playerId: string;

  @Column({ type: 'datetime', nullable: true })
  linkedAt: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => GamePlayer)
  @JoinColumn({ name: 'playerId' })
  player: GamePlayer;
}