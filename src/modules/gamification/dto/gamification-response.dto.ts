import { ApiProperty } from '@nestjs/swagger';

export class BadgeDto {
  @ApiProperty({ example: 'NIVEAU_5' })
  code: string;

  @ApiProperty({ example: 'Niveau 5 atteint' })
  label: string;

  @ApiProperty({ example: '2026-06-22T12:00:00.000Z' })
  obtenuLe: Date;
}

export class GamificationStateDto {
  @ApiProperty({ example: 150 })
  points: number;

  @ApiProperty({ example: 2 })
  niveau: number;

  @ApiProperty({ type: [BadgeDto] })
  badges: BadgeDto[];
}

export class LeaderboardEntryDto {
  @ApiProperty({ example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId: string;

  @ApiProperty({ example: 'Jean Dupont' })
  nom: string;

  @ApiProperty({ example: 320 })
  points: number;

  @ApiProperty({ example: 4 })
  niveau: number;
}
