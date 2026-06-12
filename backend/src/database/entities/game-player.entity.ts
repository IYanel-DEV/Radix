import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Game } from './game.entity';
import { PlayerFriendship } from './player-friendship.entity';

@Entity('game_players')
export class GamePlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'uuid', nullable: true })
  gameId: string;

  @ManyToOne(() => Game, (game) => game.players, { nullable: true })
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @Column({ type: 'boolean', default: false })
  isOnline: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastSeenAt: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any> | null;

  @OneToMany(() => PlayerFriendship, (friendship) => friendship.requester)
  friendshipsInitiated: PlayerFriendship[];

  @OneToMany(() => PlayerFriendship, (friendship) => friendship.addressee)
  friendshipsReceived: PlayerFriendship[];
}
