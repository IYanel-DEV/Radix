export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  module: string;
}

export interface Server {
  id: string;
  name: string;
  description?: string;
  engineType: EngineType;
  status: ServerStatus;
  map: string;
  gameMode: string;
  maxPlayers: number;
  playerCount: number;
  port: number;
  queryPort: number;
  ipAddress?: string;
  password?: string;
  region: string;
  buildVersion: string;
  cpuUsage: number;
  ramUsage: number;
  uptime: number;
  tickRate: number;
  processId?: number;
  autoRestart: boolean;
  startupCommand?: string;
  serverDirectory: string;
  executablePath: string;
  ownerId: string;
  buildId?: string;
  owner?: User;
  build?: ServerBuild;
  players?: Player[];
  createdAt: string;
  updatedAt: string;
}

export type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'crashed' | 'updating';
export type EngineType = 'godot' | 'unreal' | 'unity';

export interface ServerBuild {
  id: string;
  version: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  checksum: string;
  engineType: EngineType;
  extractedPath?: string;
  uploadedBy?: string;
  status: 'uploading' | 'extracting' | 'ready' | 'failed';
  isActive: boolean;
  isRollback: boolean;
  deployedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  id: string;
  playerId: string;
  username: string;
  ipAddress?: string;
  firstSeen: string;
  lastSeen: string;
  totalKills: number;
  totalDeaths: number;
  totalPlaytime: number;
  warnings: number;
  isBanned: boolean;
  serverId?: string;
  server?: Server;
  stats?: PlayerStat[];
  bans?: Ban[];
  createdAt: string;
  updatedAt: string;
}

export interface PlayerStat {
  id: string;
  playerId: string;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  ping: number;
  team?: string;
  sessionLength: number;
  recordedAt: string;
}

export interface Ban {
  id: string;
  playerId?: string;
  playerUsername: string;
  ipAddress?: string;
  reason: string;
  bannedBy: string;
  bannedByUser?: User;
  player?: Player;
  isPermanent: boolean;
  expiresAt?: string;
  isActive: boolean;
  appealNotes?: string;
  createdAt: string;
}

export interface Warning {
  id: string;
  playerId: string;
  issuedBy: string;
  issuedByUser?: User;
  player?: Player;
  reason: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  username: string;
  action: string;
  target?: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  module: string;
  user?: User;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface Backup {
  id: string;
  serverId: string;
  name: string;
  filePath: string;
  fileSize: number;
  type: 'manual' | 'scheduled' | 'automatic';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
}

export interface ServerMetric {
  id: string;
  serverId: string;
  timestamp: string;
  cpuUsage: number;
  ramUsage: number;
  playerCount: number;
  tickRate: number;
  networkIn?: number;
  networkOut?: number;
  createdAt: string;
}

export interface ServerConfig {
  id: string;
  serverId: string;
  configData: Record<string, unknown>;
  configVersion: number;
  updatedBy?: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalServers: number;
  onlineServers: number;
  offlineServers: number;
  totalPlayers: number;
  totalAdmins: number;
  averageCpu: number;
  averageRam: number;
  serversByStatus: Record<ServerStatus, number>;
  playerTrend: number;
  serverTrend: number;
  cpuTrend: number;
  ramTrend: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  meta?: Pagination;
  message?: string;
  warnings?: string[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface WebSocketEvents {
  'server:status': { serverId: string; status: ServerStatus };
  'metrics:update': ServerMetric;
  'log:entry': { serverId: string; level: string; message: string; timestamp: string };
  player_joined: { serverId: string; player: Player };
  player_left: { serverId: string; playerId: string; username: string };
  notification: Notification;
  server_crash: { serverId: string; reason: string };
  backup_complete: { serverId: string; backupId: string };
  'command:ack': { serverId: string; command: string; status: string; error?: string };
}

export interface FilterOption {
  key: string;
  label: string;
  value: string;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}