import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('build')
  @Roles('canUploadBuild')
  @ApiOperation({ summary: 'Upload a server build zip file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBuild(
    @UploadedFile() file: Express.Multer.File,
    @Body('engineType') engineType: string,
    @CurrentUser() user: any,
  ) {
    return this.uploadsService.uploadBuild(file, engineType, user.id, user.username);
  }

  @Post('build/:buildId/verify')
  @Roles('canUploadBuild')
  @ApiOperation({ summary: 'Verify build file integrity' })
  async verifyBuild(@Param('buildId') buildId: string) {
    return this.uploadsService.verifyBuild(buildId);
  }

  @Post('build/:buildId/deploy')
  @Roles('canDeployBuild')
  @ApiOperation({ summary: 'Deploy a build' })
  async deployBuild(@Param('buildId') buildId: string, @CurrentUser() user: any) {
    return this.uploadsService.deployBuild(buildId, user.id, user.username);
  }

  @Post('build/:buildId/rollback')
  @Roles('canRollbackBuild')
  @ApiOperation({ summary: 'Rollback to a build' })
  async rollbackBuild(@Param('buildId') buildId: string, @CurrentUser() user: any) {
    return this.uploadsService.rollbackBuild(buildId, user.id, user.username);
  }

  @Get('builds')
  @ApiOperation({ summary: 'List all builds' })
  @ApiQuery({ name: 'engineType', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAllBuilds(
    @Query('engineType') engineType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.uploadsService.getAllBuilds(engineType, page, limit);
  }

  @Get('builds/:id')
  @ApiOperation({ summary: 'Get build by ID' })
  async getBuildById(@Param('id') id: string) {
    return this.uploadsService.getBuildById(id);
  }

  @Delete('builds/:id')
  @Roles('canUploadBuild')
  @ApiOperation({ summary: 'Delete a build and remove files from disk' })
  async deleteBuild(@Param('id') id: string, @CurrentUser() user: any) {
    return this.uploadsService.deleteBuild(id, user.id, user.username);
  }
}
