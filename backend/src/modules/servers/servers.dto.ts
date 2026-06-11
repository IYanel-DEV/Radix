import { IsString, IsOptional, IsInt, IsBoolean, IsUUID, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServerStatus, EngineType } from '../../database/entities/server.entity';

export class CreateServerDto {
  @ApiProperty({ example: 'My US Server' })
  @IsString()
  name: string;

  @ApiProperty({ enum: EngineType, example: EngineType.GODOT })
  @IsEnum(EngineType)
  engineType: EngineType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'DefaultMap' })
  @IsOptional()
  @IsString()
  map?: string;

  @ApiPropertyOptional({ example: 'DefaultGameMode' })
  @IsOptional()
  @IsString()
  gameMode?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(255)
  maxPlayers?: number;

  @ApiProperty({ example: 7777 })
  @IsInt()
  @Min(1024)
  @Max(65535)
  port: number;

  @ApiProperty({ example: 7778 })
  @IsInt()
  @Min(1024)
  @Max(65535)
  queryPort: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: '1.0.0.0' })
  @IsString()
  buildVersion: string;

  @ApiPropertyOptional({ example: 'US East' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'C:/Servers/MyServer' })
  @IsOptional()
  @IsString()
  serverDirectory?: string;

  @ApiPropertyOptional({ example: 'C:/Servers/MyServer/ServerGame.exe' })
  @IsOptional()
  @IsString()
  executablePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startupCommand?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoRestart?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  buildId?: string;
}

export class UpdateServerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  map?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gameMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(255)
  maxPlayers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1024)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1024)
  @Max(65535)
  queryPort?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buildVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serverDirectory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  executablePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startupCommand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoRestart?: boolean;
}

export class ServerFilterDto {
  @ApiPropertyOptional({ enum: ServerStatus })
  @IsOptional()
  @IsEnum(ServerStatus)
  status?: ServerStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buildVersion?: string;
}

export class ExecuteCommandDto {
  @ApiProperty({ example: 'broadcast Hello players!' })
  @IsString()
  command: string;
}

export class CreateBackupDto {
  @ApiProperty({ example: 'Pre-update backup' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: ['manual', 'scheduled', 'automatic'] })
  @IsOptional()
  @IsString()
  type?: string;
}

export class UpdateServerConfigDto {
  @ApiProperty()
  configData: Record<string, any>;
}
