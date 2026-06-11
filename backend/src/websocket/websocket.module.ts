import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppGateway } from './websocket.gateway';
import { jwtConfig } from '../config/jwt.config';
import { ServersModule } from '../modules/servers/servers.module';

@Module({
  imports: [JwtModule.register(jwtConfig), forwardRef(() => ServersModule)],
  providers: [AppGateway],
  exports: [AppGateway],
})
export class WebSocketModule {}
