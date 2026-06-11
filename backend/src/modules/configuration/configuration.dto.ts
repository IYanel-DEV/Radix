import { IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  configData?: Record<string, any>;
}

export class ConfigTemplateDto {
  name: string;
  description: string;
  configData: Record<string, any>;
}
