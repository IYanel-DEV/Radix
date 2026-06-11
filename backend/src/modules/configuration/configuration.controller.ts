import { Controller, Get, Put, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigurationService } from './configuration.service';
import { UpdateConfigDto } from './configuration.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Configuration')
@Controller('config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ConfigurationController {
  constructor(private readonly configurationService: ConfigurationService) {}

  @Get('templates')
  @ApiOperation({ summary: 'Get config templates' })
  async getTemplates() {
    return this.configurationService.getTemplates();
  }

  @Get(':serverId')
  @ApiOperation({ summary: 'Get server configuration' })
  async getConfig(@Param('serverId') serverId: string) {
    return this.configurationService.getConfig(serverId);
  }

  @Put(':serverId')
  @Roles('canManageServerConfig')
  @ApiOperation({ summary: 'Update server configuration' })
  async updateConfig(
    @Param('serverId') serverId: string,
    @Body() dto: UpdateConfigDto,
    @CurrentUser() user: any,
  ) {
    return this.configurationService.updateConfig(serverId, dto, user.id, user.username);
  }

  @Post(':serverId/template')
  @Roles('canManageServerConfig')
  @ApiOperation({ summary: 'Apply a config template to server' })
  async applyTemplate(
    @Param('serverId') serverId: string,
    @Body('templateName') templateName: string,
    @CurrentUser() user: any,
  ) {
    return this.configurationService.applyTemplate(serverId, templateName, user.id, user.username);
  }
}
