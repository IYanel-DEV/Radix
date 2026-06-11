import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BansService } from './bans.service';
import { CreateBanDto, UpdateBanDto, SearchBanDto } from './bans.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Bans')
@Controller('bans')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class BansController {
  constructor(private readonly bansService: BansService) {}

  @Get()
  @Roles('canCreateBan')
  @ApiOperation({ summary: 'List all bans' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.bansService.findAll(page, limit, isActive);
  }

  @Post()
  @Roles('canCreateBan')
  @ApiOperation({ summary: 'Create a new ban' })
  async create(@Body() dto: CreateBanDto, @CurrentUser() user: any) {
    return this.bansService.create(dto, user.id, user.username);
  }

  @Get('search')
  @Roles('canCreateBan')
  @ApiOperation({ summary: 'Search bans' })
  async search(@Query() dto: SearchBanDto) {
    return this.bansService.search(dto);
  }

  @Get(':id')
  @Roles('canCreateBan')
  @ApiOperation({ summary: 'Get ban by ID' })
  async findById(@Param('id') id: string) {
    return this.bansService.findById(id);
  }

  @Put(':id')
  @Roles('canEditBan')
  @ApiOperation({ summary: 'Update a ban' })
  async update(@Param('id') id: string, @Body() dto: UpdateBanDto, @CurrentUser() user: any) {
    return this.bansService.update(id, dto, user.id, user.username);
  }

  @Delete(':id')
  @Roles('canDeleteBan')
  @ApiOperation({ summary: 'Delete a ban' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bansService.delete(id, user.id, user.username);
  }
}
