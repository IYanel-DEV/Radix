import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Player } from './player.entity';
import { User } from './user.entity';

@Entity('bans')
export class Ban {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  playerId: string;

  @Column({ type: 'varchar', length: 100 })
  playerUsername: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'uuid' })
  bannedBy: string;

  @Column({ type: 'boolean', default: false })
  isPermanent: boolean;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  appealNotes: string;

  @ManyToOne(() => Player, (player) => player.bans)
  @JoinColumn({ name: 'playerId' })
  player: Player;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'bannedBy' })
  bannedByUser: User;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
