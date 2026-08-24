import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { StatutActualite } from '../../../generated/prisma/client';

export class ActualitesSearchDto {
  @ApiPropertyOptional({
    description: 'Recherche plein texte sur le titre, l’extrait et le contenu',
    example: 'nouveau pont',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page courante', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  // Plafond aligné sur engagement/dto/pagination-query.dto.ts. Sans lui,
  // `?limit=100000` était accepté et chargeait toute la table en mémoire.
  @ApiPropertyOptional({
    description: 'Éléments par page',
    example: 10,
    default: 10,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Borne basse sur la date de l’actualité (ISO 8601)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Borne haute sur la date de l’actualité (ISO 8601)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  // `@Type(() => Boolean)` produisait `Boolean('false') === true` : le filtre
  // `?hasImage=false` retournait donc les actualités AVEC image.
  //
  // `@Type(() => String)` est indispensable : le ValidationPipe global tourne
  // avec `enableImplicitConversion`, qui coerce la valeur d'apres le type
  // declare AVANT que `@Transform` ne s'execute. Sans lui, `@Transform`
  // recevrait deja un booleen `true` et le bug se reproduirait a l'identique.
  @ApiPropertyOptional({
    description: 'Filtrer sur la présence d’une image',
    example: true,
  })
  @IsOptional()
  @Type(() => String)
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return undefined;
  })
  @IsBoolean()
  hasImage?: boolean;

  @ApiPropertyOptional({
    description:
      'Filtrer par statut de publication. Réservé aux routes back-office.',
    enum: StatutActualite,
  })
  @IsOptional()
  @IsEnum(StatutActualite)
  statut?: StatutActualite;
}
