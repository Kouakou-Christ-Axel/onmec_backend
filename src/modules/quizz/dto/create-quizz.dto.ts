import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { QuizDifficulte } from '../../../generated/prisma/client';

export class CreateChoiceDto {
  @ApiProperty({ description: 'Texte du choix', example: 'Abidjan' })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Indique si ce choix est la bonne réponse', example: true })
  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({ description: 'Texte de la question', example: 'Quelle est la capitale économique de la Côte d\'Ivoire ?' })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Liste des choix possibles', type: [CreateChoiceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChoiceDto)
  choices: CreateChoiceDto[];
}

export class CreateQuizzDto {
  @ApiProperty({ description: 'Titre du quiz', example: 'Géographie de Côte d\'Ivoire' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Description du quiz', example: 'Testez vos connaissances sur la géographie ivoirienne.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Niveau de difficulté', enum: QuizDifficulte, example: QuizDifficulte.MOYEN })
  @IsOptional()
  @IsEnum(QuizDifficulte)
  difficulte?: QuizDifficulte;

  @ApiPropertyOptional({ description: 'Identifiant de la catégorie', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsString()
  categorieId?: string;

  @ApiProperty({ description: 'Liste des questions du quiz', type: [CreateQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}

