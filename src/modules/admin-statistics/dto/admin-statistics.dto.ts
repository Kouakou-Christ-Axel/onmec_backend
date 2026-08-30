import { ApiProperty } from '@nestjs/swagger';

export class SignalementsParStatutDto {
  @ApiProperty({ example: 12 }) NOUVEAU: number;
  @ApiProperty({ example: 5 }) EN_COURS: number;
  @ApiProperty({ example: 30 }) RESOLU: number;
  @ApiProperty({ example: 2 }) REJETE: number;
}

export class SignalementsParCategorieDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  categorieId: string;

  @ApiProperty({ example: 'Voirie' })
  nom: string;

  @ApiProperty({ example: 18 })
  total: number;
}

export class SignalementsStatistiquesDto {
  @ApiProperty({ example: 49 })
  total: number;

  @ApiProperty({ type: () => SignalementsParStatutDto })
  parStatut: SignalementsParStatutDto;

  @ApiProperty({ type: [SignalementsParCategorieDto] })
  parCategorie: SignalementsParCategorieDto[];
}

export class MembresStatistiquesDto {
  @ApiProperty({ example: 1200 }) total: number;
  @ApiProperty({ example: 1150 }) actifs: number;
  @ApiProperty({ example: 40 }) suspendus: number;
  @ApiProperty({ example: 10 }) bannis: number;
}

export class QuizStatistiquesGlobalesDto {
  @ApiProperty({ example: 15 })
  totalQuiz: number;

  @ApiProperty({ example: 320 })
  totalTentatives: number;

  @ApiProperty({
    description:
      'Moyenne pondérée par tentative (pas la moyenne des moyennes par quiz), arrondie',
    example: 67,
  })
  scoreMoyenGlobal: number;
}

export class AdminStatisticsDto {
  @ApiProperty({ type: () => SignalementsStatistiquesDto })
  signalements: SignalementsStatistiquesDto;

  @ApiProperty({ type: () => MembresStatistiquesDto })
  membres: MembresStatistiquesDto;

  @ApiProperty({ type: () => QuizStatistiquesGlobalesDto })
  quiz: QuizStatistiquesGlobalesDto;
}
