import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AdminRole } from '../../../generated/prisma/client';
import { IsEmailField } from 'src/common/decorators/validation.decorators';

export class CreateAdminDto {
  @ApiProperty({ description: 'Nom complet', example: 'Awa Koné' })
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullname: string;

  @IsEmailField('Email du compte back-office')
  email: string;

  @ApiPropertyOptional({ description: 'Téléphone', example: '+2250707070707' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phone?: string;

  @ApiProperty({ enum: AdminRole, example: AdminRole.CHARGE_COMMUNICATION })
  @IsEnum(AdminRole)
  role: AdminRole;
}

export class UpdateAdminDto {
  @ApiPropertyOptional({ description: 'Nom complet' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullname?: string;

  @ApiPropertyOptional({ description: 'Téléphone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phone?: string;

  @ApiPropertyOptional({ enum: AdminRole })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;
}

export class UpdateAdminStatutDto {
  @ApiProperty({
    description: 'Activer ou désactiver le compte back-office',
    example: false,
  })
  @IsBoolean()
  isActive: boolean;
}

export class SearchAdminDto {
  @ApiPropertyOptional({ description: 'Recherche sur le nom ou l’email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: AdminRole })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class AdminResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() fullname: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() phone?: string | null;
  @ApiProperty({ enum: AdminRole }) role: AdminRole;
  @ApiPropertyOptional() avatar?: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() mustChangePassword: boolean;
  @ApiPropertyOptional() lastLoginAt?: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional() deletedAt?: Date | null;
}
