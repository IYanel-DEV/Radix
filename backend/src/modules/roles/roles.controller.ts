import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from './roles.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles('canManageRoles')
  @ApiOperation({ summary: 'List all roles' })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @Roles('canManageRoles')
  @ApiOperation({ summary: 'Create a new role' })
  async create(@Body() dto: CreateRoleDto, @CurrentUser() user: any) {
    return this.rolesService.create(dto, user.id, user.username);
  }

  @Put(':id')
  @Roles('canManageRoles')
  @ApiOperation({ summary: 'Update a role' })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto, @CurrentUser() user: any) {
    return this.rolesService.update(id, dto, user.id, user.username);
  }

  @Delete(':id')
  @Roles('canManageRoles')
  @ApiOperation({ summary: 'Delete a role' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rolesService.delete(id, user.id, user.username);
  }

  @Get(':id/permissions')
  @Roles('canManageRoles')
  @ApiOperation({ summary: 'Get permissions for a role' })
  async getPermissions(@Param('id') id: string) {
    return this.rolesService.getPermissions(id);
  }

  @Put(':id/permissions')
  @Roles('canManageRoles')
  @ApiOperation({ summary: 'Assign permissions to a role' })
  async assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionsDto, @CurrentUser() user: any) {
    return this.rolesService.assignPermissions(id, dto, user.id, user.username);
  }
}
