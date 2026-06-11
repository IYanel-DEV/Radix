import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Server } from './server.entity';

export enum BackupType {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  AUTOMATIC = 'automatic',
}

export enum BackupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('backups')
export class Backup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  serverId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 500 })
  filePath: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ type: 'varchar', enum: BackupType, default: BackupType.MANUAL })
  type: BackupType;

  @Column({ type: 'varchar', enum: BackupStatus, default: BackupStatus.PENDING })
  status: BackupStatus;

  @ManyToOne(() => Server, (server) => server.backups)
  @JoinColumn({ name: 'serverId' })
  server: Server;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
