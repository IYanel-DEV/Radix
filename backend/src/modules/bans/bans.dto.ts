import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBanDto {
  @ApiProperty()
  @IsOptional()
  @IsUUID()
  playerId?: string;

  @ApiProperty({ example: 'PlayerName' })
  @IsString()
  playerUsername: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ example: 'Cheating / Hacking' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPermanent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  expiresAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appealNotes?: string;
}

export class UpdateBanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPermanent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  expiresAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appealNotes?: string;
}

export class SearchBanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
