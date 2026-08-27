import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatutMembre } from '../../../generated/prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Jean Dupont' })
  fullname: string;

  @ApiProperty({ example: 'jean.dupont@mec-ci.org' })
  email: string;

  @ApiPropertyOptional({ example: '+2250707070707' })
  phone?: string | null;

  // Le champ s'appelle `avatar` en base et porte la clé R2 ; le service
  // retourne l'URL publique complète (R2StorageService.getPublicUrl), pas la
  // clé brute.
  @ApiPropertyOptional({ example: 'https://cdn.mec-ci.org/users-avatar/u1b2c3d4.jpg' })
  avatar?: string | null;

  @ApiProperty({ example: true })
  emailVerified: boolean;

  @ApiProperty({ enum: StatutMembre, example: StatutMembre.ACTIF })
  statut: StatutMembre;

  @ApiPropertyOptional({ example: null })
  suspendedAt?: Date | null;

  @ApiPropertyOptional({ example: null })
  suspensionRaison?: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: null })
  deletedAt?: Date | null;
}
