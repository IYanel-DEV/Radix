import { Controller, Get, Post, Put, Delete, Body, Param, Headers, UnauthorizedException, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { LiveTuningService } from './live-tuning.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { TuningType } from '../../database/entities/live-tuning.entity';

@ApiTags('Live Tuning')
@Controller('v1/tuning')
export class LiveTuningController {
  constructor(private readonly tuningService: LiveTuningService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('canManageTuning')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new tuning variable' })
  async create(@Body() body: { key: string; value: string; type: TuningType; description?: string }) {
    const tuning = await this.tuningService.create(body);
    return { message: 'Tuning variable created', tuning };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('canManageTuning')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all tuning variables' })
  async findAll() {
    const variables = await this.tuningService.findAll();
    return { variables };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('canManageTuning')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a tuning variable by ID' })
  async findOne(@Param('id') id: string) {
    const tuning = await this.tuningService.findOne(id);
    return { tuning };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('canManageTuning')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a tuning variable' })
  async update(
    @Param('id') id: string,
    @Body() body: { value?: string; type?: TuningType; description?: string; isActive?: boolean },
  ) {
    const tuning = await this.tuningService.update(id, body);
    return { message: 'Tuning variable updated', tuning };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('canManageTuning')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a tuning variable' })
  async remove(@Param('id') id: string) {
    await this.tuningService.remove(id);
    return { message: 'Tuning variable deleted' };
  }

  @Get('public/all')
  @Public()
  @ApiOperation({ summary: 'Get all active tuning variables (public - requires public key)' })
  @ApiHeader({ name: 'x-radix-public-key', required: true, description: 'Game public key' })
  async getPublicTuning(@Headers('x-radix-public-key') publicKey: string) {
    if (!publicKey) {
      throw new UnauthorizedException('x-radix-public-key header is required');
    }
    const tuning = await this.tuningService.getPublicTuning();
    return tuning;
  }
}