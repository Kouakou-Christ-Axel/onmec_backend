import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @ApiProperty({ description: 'Identifiant de la question', example: 'q1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  questionId: string;

  @ApiProperty({ description: 'Identifiant du choix sélectionné', example: 'c1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  choiceId: string;
}

export class SubmitAnswerDto {
  @ApiProperty({ description: 'Identifiant de l\'utilisateur', example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Identifiant du quiz', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  quizId: string;

  @ApiProperty({ description: 'Liste des réponses soumises', type: [AnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

