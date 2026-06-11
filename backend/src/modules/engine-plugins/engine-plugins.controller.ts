import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EnginePluginsService } from './engine-plugins.service';
import { EngineType } from '../servers/adapters/engine-adapter.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Engine Plugins')
@Controller('engine-plugins')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class EnginePluginsController {
  constructor(private readonly enginePluginsService: EnginePluginsService) {}

  @Get()
  @ApiOperation({ summary: 'List all supported game engines' })
  async getSupportedEngines() {
    return this.enginePluginsService.getSupportedEngines();
  }

  @Get('directory-structure')
  @ApiOperation({ summary: 'Get engine plugin directory structure' })
  async getDirectoryStructure() {
    return this.enginePluginsService.getPluginDirectoryStructure();
  }

  @Get(':engineType')
  @ApiOperation({ summary: 'Get engine information and plugin status' })
  async getEngineInfo(@Param('engineType') engineType: EngineType) {
    return this.enginePluginsService.getEngineInfo(engineType);
  }
}
