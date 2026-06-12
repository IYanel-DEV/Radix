import { IsString, IsEnum, IsOptional, IsUUID, IsBoolean, IsArray, IsObject, ValidateNested, MinLength, MaxLength, IsEmail, Min, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, Validate, registerDecorator, ValidationOptions } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

@ValidatorConstraint({ name: 'safeMetadata', async: false })
export class SafeMetadataConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, _args: ValidationArguments): boolean {
    return isSafeMetadata(value, 0, 3);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'metadata contains unsafe keys, excessive nesting, or non-primitive values';
  }
}

function isSafeMetadata(value: unknown, depth: number, maxDepth: number): boolean {
  if (depth > maxDepth) return false;
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!isSafeMetadata(item, depth + 1, maxDepth)) return false;
    }
    return true;
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return false;
      if (!isSafeMetadata((value as Record<string, unknown>)[key], depth + 1, maxDepth)) return false;
    }
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length > 50) return false;
    return true;
  }
  return false;
}

export function SafeMetadata(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: SafeMetadataConstraint,
    });
  };
}

export enum KeyEnvironment {
  DEVELOPMENT = 'Development',
  STAGING = 'Staging',
  PRODUCTION = 'Production',
}

export enum KeyEngine {
  GODOT = 'Godot',
  UNITY = 'Unity',
  UNREAL = 'Unreal',
  CUSTOM = 'Custom',
}

export class GenerateKeypairDto {
  @ApiProperty({ example: 'Main Dev Branch', description: 'Name for the keypair' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: KeyEnvironment, default: KeyEnvironment.DEVELOPMENT, description: 'Deployment environment' })
  @IsEnum(KeyEnvironment)
  environment: KeyEnvironment;

  @ApiProperty({ enum: KeyEngine, default: KeyEngine.GODOT, description: 'Target game engine' })
  @IsEnum(KeyEngine)
  engine: KeyEngine;
}

export class RegisterPlayerDto {
  @ApiProperty({ example: 'player1' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({ example: 'player1@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ss1' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class LoginPlayerDto {
  @ApiProperty({ example: 'player1' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'SecureP@ss1' })
  @IsString()
  password: string;
}

export class UpdatePlayerProfileDto {
  @ApiProperty({ example: { level: 42, rank: 'Gold', matches_played: 128, wins: 79 } })
  @IsObject()
  @SafeMetadata({ message: 'metadata values must be primitives (string/number/boolean/null), max 50 keys, max 3 levels deep, no __proto__/constructor/prototype keys' })
  metadata: Record<string, any>;
}

export class AddFriendDto {
  @ApiProperty({ example: 'player2' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  username: string;
}

export class RespondFriendDto {
  @ApiProperty()
  @IsBoolean()
  accept: boolean;
}

export class LinkIdentityDto {
  @ApiProperty({ enum: ['anonymous', 'steam', 'epic', 'discord', 'xbox', 'playstation', 'nintendo'] })
  @IsString()
  platform: string;

  @ApiProperty({ example: '76561197960287930' })
  @IsString()
  @MinLength(1)
  platformId: string;
}

export class CreateTuningDto {
  @ApiProperty({ example: 'max_player_speed' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  key: string;

  @ApiProperty({ example: '500' })
  @IsString()
  value: string;

  @ApiProperty({ enum: ['string', 'number', 'boolean', 'json'] })
  @IsString()
  type: string;

  @ApiPropertyOptional({ example: 'Maximum player movement speed' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateTuningDto {
  @ApiPropertyOptional({ example: '600' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ enum: ['string', 'number', 'boolean', 'json'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueuedEventDto {
  @ApiProperty({ example: 'match_end' })
  @IsString()
  actionType: string;

  @ApiProperty()
  payload: Record<string, any>;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @IsString()
  clientTimestamp: string;
}

export class SyncEventsDto {
  @ApiProperty({ type: [QueuedEventDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QueuedEventDto)
  events: QueuedEventDto[];
}

export class ToggleKeyStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}

export interface KeyPair {
  id: string;
  name: string;
  environment: KeyEnvironment;
  engine: KeyEngine;
  publicKey: string;
  secretKey: string;
  createdAt: Date;
}

export interface SafeKey {
  id: string;
  name: string;
  environment: KeyEnvironment;
  engine: KeyEngine;
  publicKeyPrefix: string;
  secretKeyMasked: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
}
