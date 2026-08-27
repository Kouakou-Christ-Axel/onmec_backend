import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { StatutMembre } from '../../../generated/prisma/client';

/**
 * Suspension / bannissement / réactivation d'un compte membre.
 *
 * Remplace l'ancien `PATCH /users/:id/lock`, qui écrivait dans `deletedAt` et
 * confondait donc le verrou de modération avec la suppression de compte.
 */
export class UpdateMemberStatutDto {
  @ApiProperty({ enum: StatutMembre, example: StatutMembre.SUSPENDU })
  @IsEnum(StatutMembre)
  statut: StatutMembre;

  @ApiPropertyOptional({
    description: 'Motif de la suspension, conservé pour traçabilité',
    example: 'Commentaires injurieux répétés',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  raison?: string;
}
