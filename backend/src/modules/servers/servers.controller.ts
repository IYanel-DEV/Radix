import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Logger, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { ServersService } from './servers.service';
import { CreateServerDto, UpdateServerDto, ServerFilterDto, ExecuteCommandDto, CreateBackupDto, UpdateServerConfigDto } from './servers.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Servers')
@Controller('servers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ServersController {
  private readonly logger = new Logger('ServersController');

  constructor(private readonly serversService: ServersService) {}

  @Get()
  @Roles('canCreateServer')
  @ApiOperation({ summary: 'List all servers with filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query() filters?: ServerFilterDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.serversService.findAll(filters, page, limit);
  }

  @Get('stats')
  @Roles('canViewMetrics')
  @ApiOperation({ summary: 'Get server dashboard stats' })
  async getStats() {
    return this.serversService.getStats();
  }

  @Post()
  @Roles('canCreateServer')
  @ApiOperation({ summary: 'Create a new server from JSON body (path-based)' })
  async create(@Body() dto: CreateServerDto, @CurrentUser() user: any) {
    return this.serversService.create(dto, user.id, user.username);
  }

  @Post('create-with-zip')
  @Roles('canCreateServer')
  @ApiOperation({ summary: 'Create a server from a zip upload with auto-discovery' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async createWithZip(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
    @Body('engineType') engineType: string,
    @Body('port') port: string,
    @Body('queryPort') queryPort: string,
    @Body('maxPlayers') maxPlayers: string,
    @Body('buildVersion') buildVersion: string,
    @Body('region') region: string,
    @Body('password') password: string,
    @Body('description') description: string,
    @Body('map') map: string,
    @Body('gameMode') gameMode: string,
    @Body('startupCommand') startupCommand: string,
    @Body('autoRestart') autoRestart: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Received server creation request for engine: ${engineType}, file: ${file?.originalname || 'NONE'}`);
    if (!file) throw new BadRequestException('Zip file is required');
    const dto = new CreateServerDto();
    dto.name = name;
    dto.engineType = (engineType || 'godot') as any;
    dto.port = parseInt(port, 10) || 7777;
    dto.queryPort = parseInt(queryPort, 10) || 27015;
    dto.maxPlayers = parseInt(maxPlayers, 10) || 100;
    dto.buildVersion = buildVersion || '1.0.0';
    dto.region = region || 'US East';
    dto.password = password || undefined;
    dto.description = description || undefined;
    dto.map = map || 'DefaultMap';
    dto.gameMode = gameMode || 'DefaultGameMode';
    dto.startupCommand = startupCommand || undefined;
    dto.autoRestart = autoRestart === 'true';
    return this.serversService.createWithZip(dto, file, user.id, user.username);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get server by ID' })
  async findById(@Param('id') id: string) {
    return this.serversService.findById(id);
  }

  @Put(':id')
  @Roles('canCreateServer')
  @ApiOperation({ summary: 'Update server settings' })
  async update(@Param('id') id: string, @Body() dto: UpdateServerDto, @CurrentUser() user: any) {
    return this.serversService.update(id, dto, user.id, user.username);
  }

  @Delete(':id')
  @Roles('canDeleteServer')
  @ApiOperation({ summary: 'Delete a server' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.serversService.delete(id, user.id, user.username);
  }

  @Post(':id/start')
  @Roles('canStartServer')
  @ApiOperation({ summary: 'Start a server' })
  async start(@Param('id') id: string, @CurrentUser() user: any) {
    return this.serversService.startServer(id, user.id, user.username);
  }

  @Post(':id/stop')
  @Roles('canStopServer')
  @ApiOperation({ summary: 'Stop a server' })
  async stop(@Param('id') id: string, @CurrentUser() user: any) {
    return this.serversService.stopServer(id, user.id, user.username);
  }

  @Post(':id/restart')
  @Roles('canRestartServer')
  @ApiOperation({ summary: 'Restart a server' })
  async restart(@Param('id') id: string, @CurrentUser() user: any) {
    return this.serversService.restartServer(id, user.id, user.username);
  }

  @Post(':id/kill')
  @Roles('canKillServer')
  @ApiOperation({ summary: 'Force kill a server process' })
  async kill(@Param('id') id: string, @CurrentUser() user: any) {
    return this.serversService.killServer(id, user.id, user.username);
  }

  @Post(':id/clone')
  @Roles('canCloneServer')
  @ApiOperation({ summary: 'Clone a server' })
  async clone(@Param('id') id: string, @Body('name') name: string, @CurrentUser() user: any) {
    return this.serversService.cloneServer(id, name, user.id, user.username);
  }

  @Post(':id/update-build')
  @Roles('canUpdateServerBuild')
  @ApiOperation({ summary: 'Update server build version' })
  async updateBuild(@Param('id') id: string, @Body('buildId') buildId: string, @CurrentUser() user: any) {
    return this.serversService.updateBuild(id, buildId, user.id, user.username);
  }

  @Post(':id/deploy')
  @Roles('canDeployBuild')
  @ApiOperation({ summary: 'Deploy a build to server with hot-restart' })
  async deploy(
    @Param('id') id: string,
    @Body('buildId') buildId: string,
    @CurrentUser() user: any,
  ) {
    return this.serversService.deployBuild(id, buildId, user.id, user.username);
  }

  @Post(':id/token')
  @Roles('canManageServerConfig')
  @ApiOperation({ summary: 'Generate S2S server token (shown once)' })
  async generateToken(@Param('id') id: string, @CurrentUser() user: any) {
    return this.serversService.generateServerToken(id, user.id, user.username);
  }

  @Post(':id/execute-command')
  @Roles('canExecuteCommand')
  @ApiOperation({ summary: 'Execute command on running server' })
  async executeCommand(@Param('id') id: string, @Body() dto: ExecuteCommandDto, @CurrentUser() user: any) {
    return this.serversService.executeCommand(id, dto, user.id, user.username);
  }

  @Get(':id/metrics')
  @Roles('canViewMetrics')
  @ApiOperation({ summary: 'Get server metrics' })
  @ApiQuery({ name: 'hours', required: false })
  async getMetrics(@Param('id') id: string, @Query('hours') hours?: number) {
    return this.serversService.getMetrics(id, hours);
  }

  @Get(':id/players')
  @ApiOperation({ summary: 'Get server players' })
  async getPlayers(@Param('id') id: string) {
    return this.serversService.getPlayers(id);
  }

  @Get(':id/logs')
  @Roles('canViewLogs')
  @ApiOperation({ summary: 'Get server logs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'level', required: false })
  async getLogs(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('level') level?: string,
  ) {
    return this.serversService.getLogs(id, page, limit, level);
  }

  @Get(':id/backups')
  @ApiOperation({ summary: 'Get server backups' })
  async getBackups(@Param('id') id: string) {
    return this.serversService.getBackups(id);
  }

  @Post(':id/backups')
  @Roles('canCreateBackup')
  @ApiOperation({ summary: 'Create a server backup' })
  async createBackup(@Param('id') id: string, @Body() dto: CreateBackupDto, @CurrentUser() user: any) {
    return this.serversService.createBackup(id, dto, user.id, user.username);
  }

  @Post(':id/backups/:backupId/restore')
  @Roles('canRestoreBackup')
  @ApiOperation({ summary: 'Restore server from backup' })
  async restoreBackup(@Param('id') id: string, @Param('backupId') backupId: string, @CurrentUser() user: any) {
    return this.serversService.restoreBackup(id, backupId, user.id, user.username);
  }

  @Get(':id/config')
  @ApiOperation({ summary: 'Get server configuration' })
  async getConfig(@Param('id') id: string) {
    return this.serversService.getConfig(id);
  }

  @Put(':id/config')
  @Roles('canManageServerConfig')
  @ApiOperation({ summary: 'Update server configuration' })
  async updateConfig(@Param('id') id: string, @Body() dto: UpdateServerConfigDto, @CurrentUser() user: any) {
    return this.serversService.updateConfig(id, dto, user.id, user.username);
  }
}
