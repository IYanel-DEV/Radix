import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../database/entities/user.entity';
import { Session } from '../../database/entities/session.entity';
import { Role } from '../../database/entities/role.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { RegisterDto, LoginDto, UpdateProfileDto } from './auth.dto';
import { jwtRefreshConfig } from '../../config/jwt.config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');
  private tokenBlacklist: Set<string> = new Set();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private jwtService: JwtService,
    private auditLogger: AuditLogger,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const defaultRole = await this.roleRepository.findOne({ where: { name: 'Read Only' } });
    if (!defaultRole) {
      throw new BadRequestException('Default role not found. Run seeds first.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const verificationToken = uuidv4();

    const user = this.userRepository.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      displayName: dto.displayName || dto.username,
      roleId: defaultRole.id,
      emailVerificationToken: verificationToken,
    });

    await this.userRepository.save(user);

    await this.auditLogger.log({
      userId: user.id,
      username: user.username,
      action: 'USER_REGISTER',
      target: 'User',
      targetId: user.id,
      module: 'Auth',
      details: { email: user.email },
    });

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: defaultRole.name,
      },
    };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.userRepository.findOne({
      where: { username: dto.username },
      select: ['id', 'username', 'email', 'password', 'displayName', 'isActive', 'isEmailVerified', 'roleId'],
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    });

    const tokens = await this.generateTokens(user, dto.rememberMe);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (dto.rememberMe ? 30 : 7));

    await this.sessionRepository.save({
      userId: user.id,
      refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
      userAgent: userAgent || 'Unknown',
      ipAddress: ipAddress || 'Unknown',
      expiresAt,
    });

    await this.auditLogger.log({
      userId: user.id,
      username: user.username,
      action: 'USER_LOGIN',
      module: 'Auth',
      details: { ipAddress, userAgent },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role?.name || 'user',
      },
    };
  }

  async logout(userId: string, refreshToken: string) {
    const sessions = await this.sessionRepository.find({ where: { userId, isRevoked: false } });

    for (const session of sessions) {
      const isMatch = await bcrypt.compare(refreshToken, session.refreshToken);
      if (isMatch) {
        await this.sessionRepository.update(session.id, { isRevoked: true });
        break;
      }
    }

    this.tokenBlacklist.add(refreshToken);

    await this.auditLogger.log({
      userId,
      username: 'unknown',
      action: 'USER_LOGOUT',
      module: 'Auth',
    });

    return { message: 'Logged out successfully' };
  }

  async refreshTokens(refreshToken: string) {
    if (this.tokenBlacklist.has(refreshToken)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: jwtRefreshConfig.secret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.sessionRepository.findOne({
      where: { userId: payload.sub, isRevoked: false },
      select: ['id', 'userId', 'refreshToken', 'expiresAt', 'isRevoked', 'createdAt'],
    });

    if (!session) {
      throw new UnauthorizedException('Session not found or revoked');
    }

    if (!refreshToken || !session.refreshToken) {
      throw new UnauthorizedException('Invalid session or refresh token');
    }

    const isTokenValid = await bcrypt.compare(refreshToken, session.refreshToken);
    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const tokens = await this.generateTokens(user);

    await this.sessionRepository.update(session.id, {
      refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role?.name || 'user',
      },
    };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepository.findOne({ where: { emailVerificationToken: token } });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.userRepository.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null as any,
    });

    await this.auditLogger.log({
      userId: user.id,
      username: user.username,
      action: 'EMAIL_VERIFIED',
      module: 'Auth',
    });

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = uuidv4();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);

    await this.userRepository.update(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    this.logger.log(`Password reset token for ${email}: ${resetToken}`);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.userRepository.update(user.id, {
      password: hashedPassword,
      passwordResetToken: null as any,
      passwordResetExpires: null as any,
    });

    await this.sessionRepository.update(
      { userId: user.id },
      { isRevoked: true },
    );

    await this.auditLogger.log({
      userId: user.id,
      username: user.username,
      action: 'PASSWORD_RESET',
      module: 'Auth',
    });

    return { message: 'Password reset successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password, ...userData } = user;
    return userData;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (dto.displayName) user.displayName = dto.displayName;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;

    await this.userRepository.save(user);

    await this.auditLogger.log({
      userId: user.id,
      username: user.username,
      action: 'PROFILE_UPDATED',
      module: 'Auth',
      details: dto,
    });

    const { password, ...userData } = user;
    return userData;
  }

  async getSessions(userId: string) {
    return this.sessionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    await this.sessionRepository.update(sessionId, { isRevoked: true });

    await this.auditLogger.log({
      userId,
      username: 'unknown',
      action: 'SESSION_REVOKED',
      target: 'Session',
      targetId: sessionId,
      module: 'Auth',
    });

    return { message: 'Session revoked successfully' };
  }

  async revokeAllSessions(userId: string) {
    await this.sessionRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );

    await this.auditLogger.log({
      userId,
      username: 'unknown',
      action: 'ALL_SESSIONS_REVOKED',
      module: 'Auth',
    });

    return { message: 'All sessions revoked successfully' };
  }

  private async generateTokens(user: User, rememberMe = false) {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role?.name || 'user',
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshPayload = {
      sub: user.id,
      type: 'refresh',
    };

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: jwtRefreshConfig.secret,
      expiresIn: rememberMe ? '30d' : jwtRefreshConfig.expiresIn,
    });

    return { accessToken, refreshToken };
  }
}
