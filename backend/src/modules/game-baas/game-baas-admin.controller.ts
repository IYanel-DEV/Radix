import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GameBaaSService } from './game-baas.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Game BaaS - Admin')
@Controller('api/game-baas/keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GameBaaSAdminController {
  constructor(private readonly gameBaaSService: GameBaaSService) {}

  @Post()
  @Roles('canManageApiKeys')
  @ApiOperation({ summary: 'Generate a new game API key' })
  async generateKey(@Body() body: { name: string }, @CurrentUser() user: any) {
    const result = await this.gameBaaSService.generateApiKey(body.name);
    return {
      message: 'API key generated successfully. Save this token - it will not be shown again.',
      ...result,
    };
  }

  @Get()
  @Roles('canManageApiKeys')
  @ApiOperation({ summary: 'List all game API keys' })
  async getKeys() {
    const keys = await this.gameBaaSService.getApiKeys();
    return { keys };
  }

  @Delete(':id')
  @Roles('canManageApiKeys')
  @ApiOperation({ summary: 'Delete a game API key' })
  async deleteKey(@Param('id') id: string) {
    await this.gameBaaSService.deleteApiKey(id);
    return { message: 'API key deleted successfully' };
  }
}