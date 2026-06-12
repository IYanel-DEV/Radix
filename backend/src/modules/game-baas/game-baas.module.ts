import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { GameBaaSService } from './game-baas.service';
import { IdentityLinksService } from './identity-links.service';
import { PulseService } from './pulse.service';
import { GameBaaSPublicController } from './game-baas-public.controller';
import { GameBaaSPlayersController } from './game-baas-players.controller';
import { GameBaaSAdminController, GameBaaSPlayerAdminController } from './game-baas-admin.controller';
import { GameBaaSEventsController } from './game-baas-events.controller';
import { PlayerGateway } from './player.gateway';
import { PublicKeyGuard } from '../../common/guards/public-key.guard';
import { ApiKey } from '../../database/entities/api-key.entity';
import { Game } from '../../database/entities/game.entity';
import { GamePlayer } from '../../database/entities/game-player.entity';
import { PlayerFriendship } from '../../database/entities/player-friendship.entity';
import { IdentityLink } from '../../database/entities/identity-link.entity';
import { PlayerPulse } from '../../database/entities/player-pulse.entity';
import { PlayerEvent } from '../../database/entities/player-event.entity';
import { jwtConfig } from '../../config/jwt.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApiKey,
      Game,
      GamePlayer,
      PlayerFriendship,
      IdentityLink,
      PlayerPulse,
      PlayerEvent,
    ]),
    JwtModule.register(jwtConfig),
  ],
  controllers: [
    GameBaaSPublicController,
    GameBaaSPlayersController,
    GameBaaSAdminController,
    GameBaaSPlayerAdminController,
    GameBaaSEventsController,
  ],
  providers: [GameBaaSService, IdentityLinksService, PulseService, PlayerGateway, PublicKeyGuard],
  exports: [GameBaaSService, IdentityLinksService, PulseService, PlayerGateway],
})
export class GameBaaSModule {}