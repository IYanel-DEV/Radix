import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../../database/entities/user.entity';
import { Session } from '../../database/entities/session.entity';
import { Role } from '../../database/entities/role.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { jwtConfig } from '../../config/jwt.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, Role, AuditLog]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register(jwtConfig),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AuditLogger],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
