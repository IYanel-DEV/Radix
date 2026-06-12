import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { ApiKey } from './api-key.entity';
import { GamePlayer } from './game-player.entity';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.games)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => ApiKey, (apiKey) => apiKey.game)
  apiKeys: ApiKey[];

  @OneToMany(() => GamePlayer, (player) => player.game)
  players: GamePlayer[];

  @Column({ type: 'int', default: 5 })
  maxKeysAllowed: number;

  @Column({ type: 'int', default: 20 })
  maxActiveHubsAllowed: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
