import { Controller, Post, Get, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DeploymentService } from './deployment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Deployment')
@Controller('deployment')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class DeploymentController {
  constructor(private readonly deploymentService: DeploymentService) {}

  @Post('deploy')
  @Roles('canDeployBuild')
  @ApiOperation({ summary: 'Deploy a build to a server' })
  async deploy(
    @Body('serverId') serverId: string,
    @Body('buildId') buildId: string,
    @CurrentUser() user: any,
  ) {
    return this.deploymentService.deploy(serverId, buildId, user.id, user.username);
  }

  @Post('rollback')
  @Roles('canRollbackBuild')
  @ApiOperation({ summary: 'Rollback a server to a previous build' })
  async rollback(
    @Body('serverId') serverId: string,
    @Body('buildId') buildId: string,
    @CurrentUser() user: any,
  ) {
    return this.deploymentService.rollback(serverId, buildId, user.id, user.username);
  }

  @Get('history')
  @Roles('canDeployBuild')
  @ApiOperation({ summary: 'Get deployment history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getHistory(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.deploymentService.getHistory(page, limit);
  }

  @Get('status/:id')
  @Roles('canDeployBuild')
  @ApiOperation({ summary: 'Get deployment status' })
  async getStatus(@Param('id') id: string) {
    return this.deploymentService.getStatus(id);
  }
}
