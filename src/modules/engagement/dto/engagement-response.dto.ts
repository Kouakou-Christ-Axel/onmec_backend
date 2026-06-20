import { ApiProperty } from '@nestjs/swagger';

export class ReactionToggleResponseDto {
  @ApiProperty({ description: "Indique si l'utilisateur aime désormais le contenu", example: true })
  liked: boolean;

  @ApiProperty({ description: 'Nombre total de likes sur le contenu', example: 42 })
  likesCount: number;
}

export class CommentaireAuteurDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ description: "Nom complet de l'auteur", example: 'Awa Koné' })
  nom: string;

  @ApiProperty({ description: "URL de l'avatar de l'auteur", example: null, nullable: true })
  avatar: string | null;
}

export class CommentaireResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Très bonne initiative !' })
  contenu: string;

  @ApiProperty({ example: '2026-06-20T10:15:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: CommentaireAuteurDto })
  auteur: CommentaireAuteurDto;
}

export class PaginatedCommentairesDto {
  @ApiProperty({ type: [CommentaireResponseDto] })
  data: CommentaireResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}
