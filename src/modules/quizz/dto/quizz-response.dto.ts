import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizDifficulte } from '@prisma/client';

export class ChoiceResponseDto {
  @ApiProperty({ example: 'c1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Abidjan' })
  text: string;
}

export class QuestionResponseDto {
  @ApiProperty({ example: 'q1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Quelle est la capitale économique de la Côte d\'Ivoire ?' })
  text: string;

  @ApiProperty({ type: [ChoiceResponseDto] })
  choices: ChoiceResponseDto[];
}

export class CategorieQuizResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Géographie' })
  nom: string;

  @ApiPropertyOptional({ example: 'Quiz sur la géographie africaine' })
  description?: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class QuizAuthorDto {
  @ApiProperty({ example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Jean Dupont' })
  fullname: string;

  @ApiProperty({ example: 'jean.dupont@example.com' })
  email: string;
}

export class QuizzResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Géographie de Côte d\'Ivoire' })
  title: string;

  @ApiPropertyOptional({ example: 'Testez vos connaissances sur la géographie ivoirienne.' })
  description?: string | null;

  @ApiPropertyOptional({ enum: QuizDifficulte, example: QuizDifficulte.MOYEN })
  difficulte?: QuizDifficulte | null;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  categorieId?: string | null;

  @ApiPropertyOptional({ type: () => CategorieQuizResponseDto })
  categorie?: CategorieQuizResponseDto | null;

  @ApiProperty({ type: () => QuizAuthorDto })
  author: QuizAuthorDto;

  @ApiProperty({ type: [QuestionResponseDto] })
  questions: QuestionResponseDto[];

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class QuizResultResponseDto {
  @ApiProperty({ example: 'r1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  quizId: string;

  @ApiProperty({ description: 'Score en pourcentage', example: 80 })
  score: number;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  completedAt?: Date | null;
}

export class QuizStatisticsResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  quizId: string;

  @ApiProperty({ example: 'Géographie de Côte d\'Ivoire' })
  title: string;

  @ApiProperty({ example: 10 })
  totalQuestions: number;

  @ApiProperty({ example: 42 })
  totalAttempts: number;

  @ApiProperty({ description: 'Score moyen en pourcentage', example: 67 })
  averageScore: number;

  @ApiProperty({ description: 'Les 10 dernières tentatives', isArray: true })
  recentAttempts: object[];
}

export class SubmitAnswerResponseDto {
  @ApiProperty({ example: 80 })
  score: number;

  @ApiProperty({ example: 8 })
  correctCount: number;

  @ApiProperty({ example: 10 })
  totalQuestions: number;

  @ApiProperty({ example: 80 })
  percentage: number;

  @ApiProperty({ example: 80, description: 'Points attribués pour cette soumission.' })
  pointsGagnes: number;
}
