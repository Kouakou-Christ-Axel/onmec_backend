import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { QuizDifficulte } from '@prisma/client';

export class SearchQuizzDto {
  @ApiPropertyOptional({ description: 'Filtrer par catégorie', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsString()
  categorieId?: string;

  @ApiPropertyOptional({ description: 'Filtrer par difficulté', enum: QuizDifficulte, example: QuizDifficulte.FACILE })
  @IsOptional()
  @IsEnum(QuizDifficulte)
  difficulte?: QuizDifficulte;

  @ApiPropertyOptional({ description: 'Recherche sur le titre ou la description', example: 'citoyenneté' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page courante', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Nombre d'éléments par page", example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
