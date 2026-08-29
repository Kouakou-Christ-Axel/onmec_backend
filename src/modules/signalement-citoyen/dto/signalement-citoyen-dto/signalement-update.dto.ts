import { ApiProperty } from '@nestjs/swagger';

export class SignalementUpdateAuteurDto {
  @ApiProperty({
    description: "Identifiant de l'admin auteur de la mise à jour",
    example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
  })
  id: string;

  @ApiProperty({
    description: "Nom complet de l'admin auteur de la mise à jour",
    example: 'Jean Kouassi',
  })
  fullname: string;
}

export class SignalementUpdateDto {
  @ApiProperty({
    description: 'Identifiant unique de la mise à jour',
    example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
  })
  id: string;

  @ApiProperty({
    description: 'Identifiant du signalement concerné',
    example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
  })
  signalementId: string;

  @ApiProperty({
    description: 'Texte de la mise à jour, visible par le citoyen',
    example: 'Une équipe a été dépêchée sur place, intervention prévue sous 48h.',
  })
  texte: string;

  @ApiProperty({
    description: 'Date de publication de la mise à jour',
    example: '2026-01-29T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description:
      "Admin auteur de la mise à jour, ou null si son compte a été supprimé entretemps",
    type: () => SignalementUpdateAuteurDto,
    nullable: true,
  })
  auteur: SignalementUpdateAuteurDto | null;
}
