import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Server } from './server.entity';

export enum BuildStatus {
  UPLOADING = 'uploading',
  EXTRACTING = 'extracting',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity('server_builds')
export class ServerBuild {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  version: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 500 })
  filePath: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ type: 'varchar', length: 128 })
  checksum: string;

  @Column({ type: 'varchar', length: 50, default: 'godot' })
  engineType: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  extractedPath: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  uploadedBy: string;

  @Column({ type: 'varchar', length: 20, default: 'uploading' })
  status: string;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isRollback: boolean;

  @Column({ type: 'datetime', nullable: true })
  deployedAt: Date;

  @OneToMany(() => Server, (server) => server.build)
  servers: Server[];

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
