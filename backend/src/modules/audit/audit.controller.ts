import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Roles('canViewAuditLogs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List all audit logs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'module', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('action') action?: string,
    @Query('module') module?: string,
  ) {
    return this.auditService.findAll(page, limit, { action, module });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  async findById(@Param('id') id: string) {
    return this.auditService.findById(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get audit logs by user' })
  async findByUser(@Param('userId') userId: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.auditService.findByUser(userId, page, limit);
  }

  @Get('module/:module')
  @ApiOperation({ summary: 'Get audit logs by module' })
  async findByModule(@Param('module') module: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.auditService.findByModule(module, page, limit);
  }
}
