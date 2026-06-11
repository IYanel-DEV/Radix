import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ChangeUserRoleDto, CreateStaffDto, UpdateStaffDto } from './admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Roles('canAccessAdminPanel')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @Roles('canAccessAdminPanel')
  @ApiOperation({ summary: 'List all staff/administrative users' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(page, limit, search);
  }

  @Get('users/:id')
  @Roles('canAccessAdminPanel')
  @ApiOperation({ summary: 'Get a single user by ID' })
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Post('users')
  @Roles('canManageUsers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new staff/administrative user' })
  async createUser(@Body() dto: CreateStaffDto, @CurrentUser() actor: any) {
    return this.adminService.createUser(dto, actor.id, actor.username);
  }

  @Put('users/:id')
  @Roles('canManageUsers')
  @ApiOperation({ summary: 'Update a user (role, status, details)' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() actor: any,
  ) {
    return this.adminService.updateUser(id, dto, actor.id, actor.username);
  }

  @Delete('users/:id')
  @Roles('canManageUsers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete/remove a staff user permanently' })
  async deleteUser(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.adminService.deleteUser(id, actor.id, actor.username);
  }

  @Put('users/:id/suspend')
  @Roles('canManageUsers')
  @ApiOperation({ summary: 'Suspend or reactivate a user account' })
  async toggleUserStatus(
    @Param('id') id: string,
    @Body('suspended') suspended: boolean,
    @CurrentUser() actor: any,
  ) {
    return this.adminService.toggleUserStatus(id, suspended, actor.id, actor.username);
  }

  @Put('users/:id/role')
  @Roles('canManageUsers')
  @ApiOperation({ summary: 'Change user role' })
  async changeUserRole(
    @Param('id') id: string,
    @Body() dto: ChangeUserRoleDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.changeUserRole(id, dto, user.id, user.username);
  }

  @Get('users/:id/activity')
  @Roles('canAccessAdminPanel')
  @ApiOperation({ summary: 'Get user activity log' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getUserActivity(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getUserActivity(id, page, limit);
  }

  @Get('dashboard')
  @Roles('canAccessAdminPanel')
  @ApiOperation({ summary: 'Get admin dashboard data' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('logs')
  @Roles('canViewAuditLogs')
  @ApiOperation({ summary: 'Get system audit logs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'module', required: false })
  async getSystemLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('level') level?: string,
    @Query('module') module?: string,
  ) {
    return this.adminService.getSystemLogs(page, limit, level, module);
  }
}
