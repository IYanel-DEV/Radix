import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { ServersModule } from './modules/servers/servers.module';
import { PlayersModule } from './modules/players/players.module';
import { BansModule } from './modules/bans/bans.module';
import { AdminModule } from './modules/admin/admin.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { LogsModule } from './modules/logs/logs.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { GameBuildsModule } from './modules/game-builds/game-builds.module';
import { ConfigurationModule } from './modules/configuration/configuration.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DeploymentModule } from './modules/deployment/deployment.module';
import { WebSocketModule } from './websocket/websocket.module';
import { HealthModule } from './modules/health/health.module';
import { EnginePluginsModule } from './modules/engine-plugins/engine-plugins.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PluginModule } from './modules/plugin/plugin.module';
import { GameBaaSModule } from './modules/game-baas/game-baas.module';
import { SeedService } from './database/seeds/seed.service';
import { Permission } from './database/entities/permission.entity';
import { Role } from './database/entities/role.entity';
import { User } from './database/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL ?? '', 10) || 60,
      limit: parseInt(process.env.THROTTLE_LIMIT ?? '', 10) || 100,
    }]),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    RolesModule,
    ServersModule,
    PlayersModule,
    BansModule,
    AdminModule,
    MetricsModule,
    LogsModule,
    UploadsModule,
    GameBuildsModule,
    ConfigurationModule,
    AuditModule,
    NotificationsModule,
    DeploymentModule,
    WebSocketModule,
    HealthModule,
    EnginePluginsModule,
    AnalyticsModule,
    PluginModule,
    GameBaaSModule,
    TypeOrmModule.forFeature([User, Role, Permission]),
  ],
  providers: [SeedService],
})
export class AppModule {}
