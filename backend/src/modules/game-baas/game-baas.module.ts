import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { GameBaaSService } from './game-baas.service';
import { GameBaaSPublicController } from './game-baas-public.controller';
import { GameBaaSPlayersController } from './game-baas-players.controller';
import { GameBaaSAdminController } from './game-baas-admin.controller';
import { PlayerGateway } from './player.gateway';
import { ApiKey } from '../../database/entities/api-key.entity';
import { GamePlayer } from '../../database/entities/game-player.entity';
import { PlayerFriendship } from '../../database/entities/player-friendship.entity';
import { jwtConfig } from '../../config/jwt.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKey, GamePlayer, PlayerFriendship]),
    JwtModule.register(jwtConfig),
  ],
  controllers: [
    GameBaaSPublicController,
    GameBaaSPlayersController,
    GameBaaSAdminController,
  ],
  providers: [GameBaaSService, PlayerGateway],
  exports: [GameBaaSService],
})
export class GameBaaSModule {}