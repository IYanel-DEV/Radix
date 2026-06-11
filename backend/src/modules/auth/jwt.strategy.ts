import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'change-me-jwt-secret-min-32-chars!!',
    });
  }

  async validate(payload: { sub: string; username: string; role: string }) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
      relations: ['role', 'role.permissions'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role?.name || 'user',
      roleId: user.roleId,
      roleName: user.role?.name,
      permissions: user.role?.permissions?.map((p) => p.name) || [],
    };
  }
}
