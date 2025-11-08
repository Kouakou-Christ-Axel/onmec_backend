import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { StatutSignalement } from '@prisma/client';

export class SearchSignalementCitoyenDto {
  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  categorieId?: string;

  @IsOptional()
  @IsEnum(StatutSignalement)
  statut?: StatutSignalement;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  citoyenId?: string;
}
