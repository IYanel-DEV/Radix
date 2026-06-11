import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { Role } from '../../database/entities/role.entity';
import { Permission } from '../../database/entities/permission.entity';
import { Server } from '../../database/entities/server.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { ChangeUserRoleDto, CreateStaffDto, UpdateStaffDto } from './admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger('AdminService');

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Server)
    private serverRepository: Repository<Server>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private auditLogger: AuditLogger,
  ) {}

  async getUsers(page = 1, limit = 20, search?: string) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const query = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .addSelect('user.password')
      .skip((p - 1) * l)
      .take(l)
      .orderBy('user.createdAt', 'DESC');

    if (search) {
      query.where(
        'user.username ILIKE :search OR user.email ILIKE :search OR user.displayName ILIKE :search',
        { search: `%${search}%` },
      );
    }

    const [users, total] = await query.getManyAndCount();

    const sanitized = users.map(({ password, ...rest }) => ({
      ...rest,
      lastActive: rest.lastLoginAt || rest.updatedAt,
    }));

    return {
      data: sanitized,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }

  async getUser(id: string) {
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

  async createUser(dto: CreateStaffDto, actorId?: string, actorName?: string) {
    const existing = await this.userRepository.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (existing) {
      throw new ConflictException('Username or email already exists');
    }

    const role = await this.roleRepository.findOne({ where: { id: dto.roleId } });
    if (!role) {
      throw new BadRequestException('Role not found');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      displayName: dto.displayName || dto.username,
      roleId: dto.roleId,
      isEmailVerified: true,
      isActive: true,
    });

    await this.userRepository.save(user);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'STAFF_CREATED',
      target: 'User',
      targetId: user.id,
      module: 'Admin',
      details: { username: dto.username, role: role.name },
    });

    const { password, ...userData } = user;
    return userData;
  }

  async updateUser(id: string, dto: UpdateStaffDto, actorId?: string, actorName?: string) {
    const user = await this.userRepository.findOne({ where: { id }, relations: ['role'] });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.email !== undefined) {
      const existing = await this.userRepository.findOne({ where: { email: dto.email } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already in use');
      }
      user.email = dto.email;
    }
    if (dto.roleId !== undefined) {
      const role = await this.roleRepository.findOne({ where: { id: dto.roleId } });
      if (!role) throw new BadRequestException('Role not found');
      user.roleId = dto.roleId;
    }
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    await this.userRepository.save(user);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'STAFF_UPDATED',
      target: 'User',
      targetId: id,
      module: 'Admin',
      details: dto,
    });

    const { password, ...userData } = user;
    return userData;
  }

  private async enforceNoLastAdmin(userId: string, _action: 'delete' | 'suspend'): Promise<void> {
    const adminPerm = await this.permissionRepository.findOne({ where: { name: 'canAccessAdminPanel' } });
    if (!adminPerm) return;

    const adminRoles = await this.roleRepository.find({ relations: ['permissions'] });
    const adminRoleIds = adminRoles
      .filter((r) => r.permissions?.some((p) => p.id === adminPerm.id))
      .map((r) => r.id);

    if (adminRoleIds.length === 0) return;

    const target = await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });
    if (!target) return;

    const isTargetAdmin = adminRoleIds.includes(target.roleId);
    if (!isTargetAdmin) return;

    const exactAdminCount = await this.userRepository.createQueryBuilder('user')
      .where('user.isActive = :active', { active: true })
      .andWhere('user.roleId IN (:...ids)', { ids: adminRoleIds })
      .getCount();

    if (exactAdminCount <= 1) {
      throw new ForbiddenException(
        'Action Denied: Cannot delete or suspend the sole remaining Administrator account. This safety block prevents permanent system lockout.',
      );
    }
  }

  async deleteUser(id: string, actorId?: string, actorName?: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.username === 'admin') {
      throw new BadRequestException('Cannot delete the primary admin account');
    }

    await this.enforceNoLastAdmin(id, 'delete');

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'STAFF_DELETED',
      target: 'User',
      targetId: id,
      module: 'Admin',
      details: { deletedUsername: user.username },
    });

    await this.userRepository.remove(user);

    return { message: 'User deleted successfully' };
  }

  async toggleUserStatus(id: string, suspended: boolean, actorId?: string, actorName?: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.username === 'admin') {
      throw new BadRequestException('Cannot suspend the primary admin account');
    }

    if (suspended) {
      await this.enforceNoLastAdmin(id, 'suspend');
    }

    user.isActive = !suspended;
    await this.userRepository.save(user);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: suspended ? 'STAFF_SUSPENDED' : 'STAFF_REACTIVATED',
      target: 'User',
      targetId: id,
      module: 'Admin',
    });

    return { message: suspended ? 'User suspended' : 'User reactivated', isActive: user.isActive };
  }

  async changeUserRole(userId: string, dto: ChangeUserRoleDto, actorId?: string, actorName?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.roleRepository.findOne({ where: { id: dto.roleId } });
    if (!role) {
      throw new BadRequestException('Role not found');
    }

    user.roleId = dto.roleId;
    await this.userRepository.save(user);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'USER_ROLE_CHANGED',
      target: 'User',
      targetId: userId,
      module: 'Admin',
      details: { newRole: role.name },
    });

    const { password, ...userData } = user;
    return userData;
  }

  async getUserActivity(userId: string, page = 1, limit = 20) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const query = this.auditLogRepository.createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
      .skip((p - 1) * l)
      .take(l)
      .orderBy('log.createdAt', 'DESC');

    const [logs, total] = await query.getManyAndCount();

    return {
      data: logs,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }

  async getDashboard() {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({ where: { isActive: true } });
    const totalServers = await this.serverRepository.count();
    const runningServers = await this.serverRepository.count({ where: { status: 'running' as any } });
    const totalAuditLogs = await this.auditLogRepository.count();

    const recentLogs = await this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      users: { total: totalUsers, active: activeUsers },
      servers: { total: totalServers, running: runningServers },
      auditLogs: { total: totalAuditLogs },
      recentActivity: recentLogs,
    };
  }

  async getSystemLogs(page = 1, limit = 50, level?: string, module?: string) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(200, Math.max(1, Number(limit) || 50));
    const query = this.auditLogRepository.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .skip((p - 1) * l)
      .take(l)
      .orderBy('log.createdAt', 'DESC');

    if (level) {
      query.andWhere('log.action ILIKE :level', { level: `%${level}%` });
    }

    if (module) {
      query.andWhere('log.module = :module', { module });
    }

    const [logs, total] = await query.getManyAndCount();

    return {
      data: logs,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }
}
