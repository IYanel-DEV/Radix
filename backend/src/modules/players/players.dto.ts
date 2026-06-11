import { IsString, IsOptional, IsUUID, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KickPlayerDto {
  @ApiProperty({ example: 'Rule violation' })
  @IsString()
  reason: string;
}

export class BanPlayerDto {
  @ApiProperty({ example: 'Cheating' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isPermanent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  expiresAt?: Date;
}

export class MutePlayerDto {
  @ApiProperty({ example: 'Spamming' })
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  durationMinutes?: number;
}

export class WarnPlayerDto {
  @ApiProperty({ example: 'Please follow the rules' })
  @IsString()
  reason: string;
}

export class TeleportPlayerDto {
  @ApiProperty({ example: '100.5' })
  @IsString()
  x: string;

  @ApiProperty({ example: '200.3' })
  @IsString()
  y: string;

  @ApiProperty({ example: '50.0' })
  @IsString()
  z: string;
}

export class MessagePlayerDto {
  @ApiProperty({ example: 'Welcome to the server!' })
  @IsString()
  message: string;
}
