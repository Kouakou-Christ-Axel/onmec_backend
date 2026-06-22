import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ModerationListQueryDto {
  @ApiPropertyOptional({ description: 'Numéro de la page (commence à 1)', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: "Nombre d'éléments par page", example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Filtre optionnel sur le type de cible des commentaires',
    enum: ['signalement', 'actualite'],
    example: 'signalement',
  })
  @IsOptional()
  @IsIn(['signalement', 'actualite'])
  cible?: 'signalement' | 'actualite';
}
