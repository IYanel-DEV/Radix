import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { GamePlayer } from './game-player.entity';

export enum FriendStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  BLOCKED = 'BLOCKED',
}

@Entity('player_friendships')
export class PlayerFriendship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  requesterId: string;

  @Column({ type: 'uuid' })
  addresseeId: string;

  @Column({ type: 'varchar', length: 20, default: FriendStatus.PENDING })
  status: FriendStatus;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => GamePlayer, (player) => player.friendshipsInitiated)
  @JoinColumn({ name: 'requesterId' })
  requester: GamePlayer;

  @ManyToOne(() => GamePlayer, (player) => player.friendshipsReceived)
  @JoinColumn({ name: 'addresseeId' })
  addressee: GamePlayer;
}