import { ApiProperty } from '@nestjs/swagger';

export class ModerationAuteurDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', nullable: true })
  id: string | null;

  @ApiProperty({ description: "Nom complet de l'auteur", example: 'Awa Koné', nullable: true })
  nom: string | null;
}

export class ModerationCibleDto {
  @ApiProperty({ enum: ['signalement', 'actualite'], example: 'signalement' })
  type: 'signalement' | 'actualite';

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  id: string;

  @ApiProperty({ description: 'Titre du signalement ou de l\'actualité', example: 'Nid-de-poule rue X' })
  titre: string;
}

export class ModerationCommentaireResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Très bonne initiative !' })
  contenu: string;

  @ApiProperty({ example: '2026-06-20T10:15:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Indique si le commentaire est masqué par la modération', example: false })
  masque: boolean;

  @ApiProperty({ type: ModerationAuteurDto })
  auteur: ModerationAuteurDto;

  @ApiProperty({ type: ModerationCibleDto, nullable: true })
  cible: ModerationCibleDto | null;
}

export class PaginatedModerationCommentairesDto {
  @ApiProperty({ type: [ModerationCommentaireResponseDto] })
  data: ModerationCommentaireResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}
