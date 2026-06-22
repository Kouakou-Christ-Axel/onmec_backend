import { ApiProperty } from '@nestjs/swagger';

export class BadgeDto {
  @ApiProperty({ description: 'Code technique du badge', example: 'actif' })
  code: string;

  @ApiProperty({ description: 'Libellé lisible du badge', example: 'Citoyen actif' })
  label: string;

  @ApiProperty({
    description: "Date d'obtention du badge (ISO 8601)",
    example: '2026-06-22T10:15:00.000Z',
  })
  obtenuLe: string;
}

export class GamificationStateDto {
  @ApiProperty({ description: 'Points cumulés', example: 150 })
  points: number;

  @ApiProperty({ description: 'Niveau dérivé des points', example: 2 })
  niveau: number;

  @ApiProperty({ description: 'Badges obtenus', type: [BadgeDto] })
  badges: BadgeDto[];
}

export class LeaderboardEntryDto {
  @ApiProperty({
    description: "Identifiant de l'utilisateur",
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  userId: string;

  @ApiProperty({ description: "Nom complet de l'utilisateur", example: 'Awa Koné' })
  nom: string;

  @ApiProperty({ description: 'Points cumulés', example: 150 })
  points: number;

  @ApiProperty({ description: 'Niveau', example: 2 })
  niveau: number;
}
