import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { Session } from '../../database/entities/session.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { CreateUserDto, UpdateUserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private auditLogger: AuditLogger,
  ) {}

  async findAll(page = 1, limit = 20, search?: string) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const query = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .skip((p - 1) * l)
      .take(l)
      .orderBy('user.createdAt', 'DESC');

    if (search) {
      query.where('user.username ILIKE :search OR user.email ILIKE :search OR user.displayName ILIKE :search',
        { search: `%${search}%` });
    }

    const [users, total] = await query.getManyAndCount();

    const usersWithoutPassword = users.map(({ password, ...rest }) => rest);

    return {
      data: usersWithoutPassword,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }

  async findById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userData } = user;
    return userData;
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string, actorName?: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.username) {
      const existing = await this.userRepository.findOne({ where: { username: dto.username } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Username already taken');
      }
      user.username = dto.username;
    }

    if (dto.email) {
      const existing = await this.userRepository.findOne({ where: { email: dto.email } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already taken');
      }
      user.email = dto.email;
    }

    if (dto.displayName) user.displayName = dto.displayName;
    if (dto.roleId !== undefined) user.roleId = dto.roleId;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    await this.userRepository.save(user);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'USER_UPDATED',
      target: 'User',
      targetId: id,
      module: 'Users',
      details: dto,
    });

    const { password, ...userData } = user;
    return userData;
  }

  async delete(id: string, actorId?: string, actorName?: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.sessionRepository.update({ userId: id }, { isRevoked: true });
    await this.userRepository.remove(user);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'USER_DELETED',
      target: 'User',
      targetId: id,
      module: 'Users',
      details: { username: user.username },
    });

    return { message: 'User deleted successfully' };
  }

  async getUserSessions(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sessionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
