import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, UpdateDateColumn, JoinColumn, Unique } from 'typeorm';
import { Server } from './server.entity';
import { User } from './user.entity';

@Entity('server_configs')
@Unique(['serverId'])
export class ServerConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  serverId: string;

  @Column({ type: 'simple-json' })
  configData: Record<string, any>;

  @Column({ type: 'int', default: 1 })
  configVersion: number;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => Server)
  @JoinColumn({ name: 'serverId' })
  server: Server;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updatedBy' })
  updatedByUser: User;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
