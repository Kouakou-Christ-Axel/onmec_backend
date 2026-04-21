import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
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
}
