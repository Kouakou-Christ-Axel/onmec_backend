import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { StatutSignalement } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchSignalementCitoyenDto {
  @ApiPropertyOptional({
    description: 'Rechercher par titre du signalement',
    example: 'Nid de poule',
  })
  @IsOptional()
  @IsString()
  titre?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par identifiant de catégorie',
    example: 'c1a2t3e4g5o6r7i8e9-0a1b-2c3d-4e5f-6g7h8i9j0k1l',
  })
  @IsOptional()
  @IsString()
  categorieId?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par statut du signalement',
    enum: StatutSignalement,
    example: StatutSignalement.NOUVEAU,
  })
  @IsOptional()
  @IsEnum(StatutSignalement)
  statut?: StatutSignalement;

  @ApiPropertyOptional({
    description: 'Filtrer par latitude',
    example: 5.3600,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Filtrer par longitude',
    example: -4.0083,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Filtrer par identifiant du citoyen',
    example: 'u1s2e3r4-5i6d-7h8e-9r0e-1a2b3c4d5e6f',
  })
  @IsOptional()
  @IsString()
  citoyenId?: string;

  @ApiPropertyOptional({
    description: 'Numéro de la page',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({
    description: 'Nombre d\'éléments par page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
