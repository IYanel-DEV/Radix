import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../database/entities/role.entity';
import { Permission } from '../../database/entities/permission.entity';
import { AuditLogger } from '../../common/utils/audit-logger';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from './roles.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private auditLogger: AuditLogger,
  ) {}

  async findAll() {
    return this.roleRepository.find({
      relations: ['permissions'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async create(dto: CreateRoleDto, actorId?: string, actorName?: string) {
    const existing = await this.roleRepository.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException('Role name already exists');
    }

    const role = this.roleRepository.create({
      name: dto.name,
      description: dto.description || '',
    });

    if (dto.permissionIds?.length) {
      const permissions = await this.permissionRepository.findByIds(dto.permissionIds);
      role.permissions = permissions;
    }

    await this.roleRepository.save(role);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'ROLE_CREATED',
      target: 'Role',
      targetId: role.id,
      module: 'Roles',
      details: { name: dto.name },
    });

    return this.findById(role.id);
  }

  async update(id: string, dto: UpdateRoleDto, actorId?: string, actorName?: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem && dto.name && dto.name !== role.name) {
      throw new BadRequestException('Cannot rename system roles');
    }

    if (dto.name) {
      const existing = await this.roleRepository.findOne({ where: { name: dto.name } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Role name already exists');
      }
      role.name = dto.name;
    }

    if (dto.description !== undefined) {
      role.description = dto.description;
    }

    if (dto.permissionIds) {
      const permissions = await this.permissionRepository.findByIds(dto.permissionIds);
      role.permissions = permissions;
    }

    await this.roleRepository.save(role);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'ROLE_UPDATED',
      target: 'Role',
      targetId: id,
      module: 'Roles',
      details: dto,
    });

    return this.findById(role.id);
  }

  async delete(id: string, actorId?: string, actorName?: string) {
    const role = await this.roleRepository.findOne({ where: { id }, relations: ['users'] });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    if (role.users?.length > 0) {
      throw new BadRequestException('Cannot delete role with assigned users');
    }

    await this.roleRepository.remove(role);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'ROLE_DELETED',
      target: 'Role',
      targetId: id,
      module: 'Roles',
      details: { name: role.name },
    });

    return { message: 'Role deleted successfully' };
  }

  async getPermissions(roleId: string) {
    const role = await this.findById(roleId);
    return role.permissions;
  }

  async assignPermissions(roleId: string, dto: AssignPermissionsDto, actorId?: string, actorName?: string) {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const permissions = await this.permissionRepository.findByIds(dto.permissionIds);
    role.permissions = permissions;

    await this.roleRepository.save(role);

    await this.auditLogger.log({
      userId: actorId,
      username: actorName || 'system',
      action: 'PERMISSIONS_ASSIGNED',
      target: 'Role',
      targetId: roleId,
      module: 'Roles',
      details: { permissionIds: dto.permissionIds },
    });

    return this.findById(roleId);
  }
}
