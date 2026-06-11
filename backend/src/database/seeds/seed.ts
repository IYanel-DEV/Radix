import { createConnection } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { databaseConfig } from '../../config/database.config';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { User } from '../entities/user.entity';
import { allPermissions } from '../../modules/roles/permissions.seed';

async function seed() {
  console.log('Starting database seeding...');

  const connection = await createConnection(databaseConfig as any);

  const permissionRepository = connection.getRepository(Permission);
  const roleRepository = connection.getRepository(Role);
  const userRepository = connection.getRepository(User);

  const existingPermissions = await permissionRepository.count();
  if (existingPermissions === 0) {
    console.log('Seeding permissions...');
    for (const permData of allPermissions) {
      const perm = permissionRepository.create(permData);
      await permissionRepository.save(perm);
    }
    console.log(`Created ${allPermissions.length} permissions`);
  } else {
    console.log('Permissions already exist, skipping');
  }

  const allPerms = await permissionRepository.find();

  const roleData = [
    { name: 'Super Admin', description: 'Full system access with all permissions', isSystem: true },
    { name: 'Owner', description: 'Server owner with full management capabilities', isSystem: true },
    { name: 'Admin', description: 'Administrator with most permissions', isSystem: true },
    { name: 'Moderator', description: 'Can moderate servers and players', isSystem: true },
    { name: 'Support Staff', description: 'Can assist players and view logs', isSystem: true },
    { name: 'Read Only', description: 'Can only view server status and data', isSystem: true },
  ];

  const roles: Role[] = [];
  for (const roleDataItem of roleData) {
    let role = await roleRepository.findOne({ where: { name: roleDataItem.name } });
    if (!role) {
      role = roleRepository.create(roleDataItem);
      if (roleDataItem.name === 'Super Admin') {
        role.permissions = allPerms;
      }
      await roleRepository.save(role);
      console.log(`Created role: ${role.name}`);
    } else {
      console.log(`Role already exists: ${role.name}`);
    }
    roles.push(role);
  }

  const adminUser = await userRepository.findOne({ where: { username: 'admin' } });
  if (!adminUser) {
    const superAdminRole = roles.find((r) => r.name === 'Super Admin');
    const hashedPassword = await bcrypt.hash('admin123456', 12);

    const user = userRepository.create({
      username: 'admin',
      email: 'admin@servermanager.com',
      password: hashedPassword,
      displayName: 'System Administrator',
      roleId: superAdminRole!.id,
      isEmailVerified: true,
      isActive: true,
    });

    await userRepository.save(user);
    console.log('Created admin user (username: admin, password: set-via-env)');
  } else {
    console.log('Admin user already exists');
  }

  console.log('Seeding complete!');
  await connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
