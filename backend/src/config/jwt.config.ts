import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfig: JwtModuleOptions = {
  secret: process.env.JWT_SECRET || 'change-me-jwt-secret-min-32-chars!!',
  signOptions: {
    expiresIn: process.env.JWT_EXPIRATION || '15m',
  },
};

export const jwtRefreshConfig = {
  secret: process.env.JWT_REFRESH_SECRET || 'change-me-jwt-refresh-secret-min-32-chars!!',
  expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
};
