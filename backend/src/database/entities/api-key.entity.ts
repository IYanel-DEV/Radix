import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Game } from './game.entity';

export enum KeyEnvironment {
  DEVELOPMENT = 'Development',
  STAGING = 'Staging',
  PRODUCTION = 'Production',
}

export enum KeyEngine {
  GODOT = 'Godot',
  UNITY = 'Unity',
  UNREAL = 'Unreal',
  CUSTOM = 'Custom',
}

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, default: KeyEnvironment.DEVELOPMENT })
  environment: KeyEnvironment;

  @Column({ type: 'varchar', length: 20, default: KeyEngine.GODOT })
  engine: KeyEngine;

  @Column({ type: 'uuid', nullable: false })
  gameId: string;

  @ManyToOne(() => Game, (game) => game.apiKeys)
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @Column({ type: 'varchar', length: 255 })
  publicKeyHash: string;

  @Column({ type: 'varchar', length: 255 })
  secretKeyHash: string;

  @Column({ type: 'varchar', length: 20, default: 'radix_pub_' })
  publicKeyPrefix: string;

  @Column({ type: 'varchar', length: 20, default: 'radix_sec_' })
  secretKeyPrefix: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
