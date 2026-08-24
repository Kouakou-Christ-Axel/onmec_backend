import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatutMembre } from '../../../generated/prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchUserDto {
  @ApiPropertyOptional({
    description: "Recherche libre sur le nom, l'email ou le téléphone",
    example: 'jean',
  })
  @IsOptional()
  @IsString()
  search?: string;

  // Remplace l'ancien filtre par rôle : les rôles n'existent plus côté membre.
  @ApiPropertyOptional({
    description: 'Filtrer par statut de modération du compte',
    enum: StatutMembre,
    example: StatutMembre.ACTIF,
  })
  @IsOptional()
  @IsEnum(StatutMembre)
  statut?: StatutMembre;

  @ApiPropertyOptional({
    description: 'Filtrer sur la suppression du compte',
    enum: ['ACTIVE', 'INACTIVE'],
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'] as const)
  status?: 'ACTIVE' | 'INACTIVE';

  @ApiPropertyOptional({ description: 'Page courante', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

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
}
