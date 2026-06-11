import { Controller, Get, Delete, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import * as path from 'path';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Logs')
@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Roles('canViewLogs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @ApiOperation({ summary: 'List logs with filters' })
  @ApiQuery({ name: 'serverId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('serverId') serverId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('level') level?: string,
    @Query('search') search?: string,
  ) {
    return this.logsService.findAll(serverId, page, limit, level, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get log entry by ID' })
  async findById(@Param('id') id: string) {
    return this.logsService.findById(id);
  }

  @Delete()
  @Roles('canManageSystem')
  @ApiOperation({ summary: 'Delete logs' })
  @ApiQuery({ name: 'serverId', required: false })
  async deleteAll(@Query('serverId') serverId?: string) {
    return this.logsService.deleteAll(serverId);
  }

  @Get('download')
  @ApiOperation({ summary: 'Download logs as CSV' })
  @ApiQuery({ name: 'serverId', required: false })
  @ApiQuery({ name: 'level', required: false })
  async download(
    @Query('serverId') serverId?: string,
    @Query('level') level?: string,
    @Res() res?: Response,
  ) {
    const filePath = await this.logsService.downloadLogs(serverId, level);
    const fileName = path.basename(filePath);
    if (res) res.download(filePath, fileName);
  }
}
