import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AdminRole,
  ScopeActualite,
  StatutActualite,
} from '../../../generated/prisma/client';

export class ActualiteAuthorDto {
  @ApiProperty({ example: '10000000-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ example: 'Administrateur national' })
  fullname: string;

  @ApiProperty({ enum: AdminRole, example: AdminRole.CHARGE_COMMUNICATION })
  role: AdminRole;
}

/** Forme commune d'une categorie et d'un tag dans une reponse d'actualite. */
export class ActualiteTaxonDto {
  @ApiProperty({ example: '20000000-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ example: 'Infrastructure' })
  nom: string;

  @ApiProperty({ example: 'infrastructure' })
  slug: string;
}

export class ActualiteResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'inauguration-du-nouveau-pont' })
  slug: string;

  @ApiProperty({ example: "Inauguration du nouveau pont d'Abidjan" })
  title: string;

  @ApiProperty({
    example: 'Le nouveau pont a été officiellement inauguré ce matin.',
  })
  excerpt: string;

  @ApiProperty({
    example: '<p>Le nouveau pont reliant le Plateau à Treichville…</p>',
  })
  content: string;

  @ApiProperty({ example: '2026-04-21T08:00:00.000Z' })
  date: Date;

  @ApiPropertyOptional({
    example: 'https://cdn.mec-ci.org/actualites/pont-abidjan.jpg',
  })
  imageUrl?: string | null;

  @ApiProperty({ enum: StatutActualite, example: StatutActualite.PUBLIEE })
  statut: StatutActualite;

  @ApiProperty({
    description: 'Canal de diffusion',
    enum: ScopeActualite,
    example: ScopeActualite.WEB,
  })
  scope: ScopeActualite;

  @ApiPropertyOptional({
    description: 'Date de première publication',
    example: '2026-04-21T09:00:00.000Z',
  })
  publishedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Auteur back-office. Null si le compte a été supprimé.',
    type: ActualiteAuthorDto,
  })
  author?: ActualiteAuthorDto | null;

  @ApiPropertyOptional({
    description:
      'Catégorie éditoriale. Null uniquement si la catégorie a été retirée après coup.',
    type: ActualiteTaxonDto,
  })
  categorie?: ActualiteTaxonDto | null;

  @ApiProperty({
    description: 'Tags libres. Tableau vide si aucun.',
    type: [ActualiteTaxonDto],
  })
  tags: ActualiteTaxonDto[];

  // Ces trois champs étaient déjà retournés par le service mais absents de la
  // documentation Swagger.
  @ApiProperty({ description: 'Nombre de likes', example: 12 })
  likesCount: number;

  @ApiProperty({ description: 'Nombre de commentaires visibles', example: 3 })
  commentsCount: number;

  @ApiProperty({
    description: 'Vrai si le membre authentifié a liké cette actualité',
    example: false,
  })
  likedByMe: boolean;

  @ApiProperty({ example: '2026-04-21T09:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-21T09:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: null })
  deletedAt?: Date | null;
}
