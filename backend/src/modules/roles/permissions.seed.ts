import { Permission } from '../../database/entities/permission.entity';
import { Role } from '../../database/entities/role.entity';
import { Repository } from 'typeorm';

const allPermissions = [
  // Server management
  { name: 'canCreateServer', description: 'Can create new servers', module: 'Servers' },
  { name: 'canDeleteServer', description: 'Can delete servers', module: 'Servers' },
  { name: 'canStartServer', description: 'Can start servers', module: 'Servers' },
  { name: 'canStopServer', description: 'Can stop servers', module: 'Servers' },
  { name: 'canRestartServer', description: 'Can restart servers', module: 'Servers' },
  { name: 'canKillServer', description: 'Can force kill servers', module: 'Servers' },
  { name: 'canCloneServer', description: 'Can clone servers', module: 'Servers' },
  { name: 'canUpdateServerBuild', description: 'Can update server build version', module: 'Servers' },
  { name: 'canExecuteCommand', description: 'Can execute commands on servers', module: 'Servers' },
  { name: 'canManageServerConfig', description: 'Can manage server configuration', module: 'Servers' },

  // Player management
  { name: 'canKickPlayer', description: 'Can kick players', module: 'Players' },
  { name: 'canBanPlayer', description: 'Can ban players', module: 'Players' },
  { name: 'canMutePlayer', description: 'Can mute players', module: 'Players' },
  { name: 'canWarnPlayer', description: 'Can warn players', module: 'Players' },
  { name: 'canTeleportPlayer', description: 'Can teleport players', module: 'Players' },
  { name: 'canMessagePlayer', description: 'Can send messages to players', module: 'Players' },

  // Ban management
  { name: 'canCreateBan', description: 'Can create bans', module: 'Bans' },
  { name: 'canEditBan', description: 'Can edit bans', module: 'Bans' },
  { name: 'canDeleteBan', description: 'Can delete bans', module: 'Bans' },
  { name: 'canAppealBan', description: 'Can appeal bans', module: 'Bans' },

  // User management
  { name: 'canManageUsers', description: 'Can manage users', module: 'Users' },
  { name: 'canManageRoles', description: 'Can manage roles and permissions', module: 'Roles' },

  // Admin
  { name: 'canAccessAdminPanel', description: 'Can access admin panel', module: 'Admin' },
  { name: 'canViewAuditLogs', description: 'Can view audit logs', module: 'Admin' },
  { name: 'canManageSystem', description: 'Can manage system settings', module: 'Admin' },

  // Backups
  { name: 'canCreateBackup', description: 'Can create backups', module: 'Backups' },
  { name: 'canRestoreBackup', description: 'Can restore backups', module: 'Backups' },
  { name: 'canDeleteBackup', description: 'Can delete backups', module: 'Backups' },

  // Uploads & Deployments
  { name: 'canUploadBuild', description: 'Can upload server builds', module: 'Uploads' },
  { name: 'canDeployBuild', description: 'Can deploy builds to servers', module: 'Deployment' },
  { name: 'canRollbackBuild', description: 'Can rollback builds', module: 'Deployment' },

  // Notifications
  { name: 'canSendNotifications', description: 'Can send notifications', module: 'Notifications' },

  // Metrics
  { name: 'canViewMetrics', description: 'Can view metrics', module: 'Metrics' },
  { name: 'canViewLogs', description: 'Can view server logs', module: 'Logs' },
];

export async function seedPermissions(permissionRepository: Repository<Permission>, roleRepository: Repository<Role>) {
  const existingCount = await permissionRepository.count();
  if (existingCount > 0) {
    console.log('Permissions already seeded');
    return;
  }

  for (const permData of allPermissions) {
    const perm = permissionRepository.create(permData);
    await permissionRepository.save(perm);
  }

  console.log(`Seeded ${allPermissions.length} permissions`);

  const allPerms = await permissionRepository.find();

  const superAdminRole = await roleRepository.findOne({ where: { name: 'Super Admin' } });
  if (superAdminRole) {
    superAdminRole.permissions = allPerms;
    await roleRepository.save(superAdminRole);
    console.log('Assigned all permissions to Super Admin role');
  }
}

export { allPermissions };
