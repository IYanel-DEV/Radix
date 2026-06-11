import { Controller, Get, Post, Delete, Param, Body, Query, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { GameBuildsService } from './game-builds.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Builds')
@Controller('builds')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class GameBuildsController {
  constructor(private readonly gameBuildsService: GameBuildsService) {}

  @Post('upload')
  @Roles('canUploadBuild')
  @ApiOperation({ summary: 'Upload a game server build zip file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBuild(
    @UploadedFile() file: Express.Multer.File,
    @Body('engineType') engineType: string,
    @CurrentUser() user: any,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.gameBuildsService.uploadBuild(file, engineType, user.id, user.username);
  }

  @Get()
  @ApiOperation({ summary: 'List all game builds' })
  @ApiQuery({ name: 'engineType', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAllBuilds(
    @Query('engineType') engineType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.gameBuildsService.getAllBuilds(engineType, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a build by ID' })
  async getBuildById(@Param('id') id: string) {
    return this.gameBuildsService.getBuildById(id);
  }

  @Delete(':id')
  @Roles('canUploadBuild')
  @ApiOperation({ summary: 'Delete a build and remove files from disk' })
  async deleteBuild(@Param('id') id: string, @CurrentUser() user: any) {
    return this.gameBuildsService.deleteBuild(id, user.id, user.username);
  }
}
