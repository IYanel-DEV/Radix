import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Player } from './player.entity';
import { User } from './user.entity';

@Entity('warnings')
export class Warning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  playerId: string;

  @Column({ type: 'uuid' })
  issuedBy: string;

  @Column({ type: 'text' })
  reason: string;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'playerId' })
  player: Player;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'issuedBy' })
  issuedByUser: User;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
