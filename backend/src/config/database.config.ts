import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { Permission } from '../database/entities/permission.entity';
import { Session } from '../database/entities/session.entity';
import { Server } from '../database/entities/server.entity';
import { ServerBuild } from '../database/entities/server-build.entity';
import { ServerMetric } from '../database/entities/server-metric.entity';
import { Player } from '../database/entities/player.entity';
import { PlayerStat } from '../database/entities/player-stat.entity';
import { Ban } from '../database/entities/ban.entity';
import { Warning } from '../database/entities/warning.entity';
import { AuditLog } from '../database/entities/audit-log.entity';
import { Notification } from '../database/entities/notification.entity';
import { Backup } from '../database/entities/backup.entity';
import { ServerLog } from '../database/entities/server-log.entity';
import { ServerConfig } from '../database/entities/server-config.entity';
import { Game } from '../database/entities/game.entity';
import { ApiKey } from '../database/entities/api-key.entity';
import { GamePlayer } from '../database/entities/game-player.entity';
import { PlayerFriendship } from '../database/entities/player-friendship.entity';
import { PlayerEvent } from '../database/entities/player-event.entity';
import { IdentityLink } from '../database/entities/identity-link.entity';
import { PlayerPulse } from '../database/entities/player-pulse.entity';
import { LiveTuning } from '../database/entities/live-tuning.entity';

const entities = [
  User, Role, Permission, Session,
  Server, ServerBuild, ServerMetric, Player, PlayerStat,
  Ban, Warning, AuditLog, Notification, Backup,
  ServerLog, ServerConfig,
  Game, ApiKey, GamePlayer, PlayerFriendship, PlayerEvent,
  IdentityLink, PlayerPulse, LiveTuning,
];

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

function getPostgresConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '', 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'change-me',
    database: process.env.DB_DATABASE || 'server_manager',
    entities,
    synchronize: true,
    logging: isDev ? ['error', 'warn'] : false,
  } as TypeOrmModuleOptions;
}

function getSqliteConfig(): TypeOrmModuleOptions {
  return {
    type: 'sqljs',
    location: process.env.DB_PATH || './data/server_manager.db',
    autoSave: true,
    entities,
    synchronize: true,
    logging: ['error', 'warn'],
  } as TypeOrmModuleOptions;
}

export const databaseConfig: TypeOrmModuleOptions =
  process.env.DB_TYPE === 'postgres' || process.env.NODE_ENV === 'production'
    ? getPostgresConfig()
    : getSqliteConfig();