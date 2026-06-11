import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { User } from '../entities/user.entity';
import { allPermissions } from '../../modules/roles/permissions.seed';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('SeedService');

  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    await this.seed();
  }

  async seed() {
    this.logger.log('Checking if seeding is required...');

    const existingPermissions = await this.permissionRepository.count();
    if (existingPermissions === 0) {
      this.logger.log('Seeding permissions...');
      for (const permData of allPermissions) {
        await this.permissionRepository.save(this.permissionRepository.create(permData));
      }
      this.logger.log(`Created ${allPermissions.length} permissions`);
    }

    const allPerms = await this.permissionRepository.find();

    const roleData = [
      { name: 'Super Admin', description: 'Full system access with all permissions', isSystem: true },
      { name: 'Owner', description: 'Server owner with full management capabilities', isSystem: true },
      { name: 'Admin', description: 'Administrator with most permissions', isSystem: true },
      { name: 'Moderator', description: 'Can moderate servers and players', isSystem: true },
      { name: 'Support Staff', description: 'Can assist players and view logs', isSystem: true },
      { name: 'Read Only', description: 'Can only view server status and data', isSystem: true },
    ];

    const roles: Role[] = [];
    for (const data of roleData) {
      let role = await this.roleRepository.findOne({ where: { name: data.name } });
      if (!role) {
        role = this.roleRepository.create(data);
        if (data.name === 'Super Admin') {
          role.permissions = allPerms;
        }
        await this.roleRepository.save(role);
        this.logger.log(`Created role: ${role.name}`);
      }
      roles.push(role);
    }

    const adminUser = await this.userRepository.findOne({ where: { username: 'admin' } });
    if (!adminUser) {
      const superAdminRole = roles.find((r) => r.name === 'Super Admin');
      const hashedPassword = await bcrypt.hash('admin123456', 12);

      const user = this.userRepository.create({
        username: 'admin',
        email: 'admin@servermanager.com',
        password: hashedPassword,
        displayName: 'System Administrator',
        roleId: superAdminRole!.id,
        isEmailVerified: true,
        isActive: true,
      });

      await this.userRepository.save(user);
      this.logger.log('==========================================');
      this.logger.log('Admin user created:');
      this.logger.log('  Username: admin');
      this.logger.log('  Password: admin123456');
      this.logger.log('==========================================');
    }

    this.logger.log('Seed check complete.');
  }
}
