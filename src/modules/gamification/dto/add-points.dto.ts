import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AddPointsDto {
  // Obligatoire depuis la separation admin/membre : l'endpoint etant reserve au
  // back-office, l'appelant est toujours un admin, et son identifiant n'existe
  // pas dans la table `members` que reference PointTransaction. L'ancien repli
  // « omis, les points vont au compte appelant » ne pouvait donc plus produire
  // qu'une violation de cle etrangere.
  @ApiProperty({
    description: 'Identifiant du membre destinataire.',
    example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Nombre de points à attribuer (peut être positif).',
    example: 50,
  })
  @Type(() => Number)
  @IsInt()
  points: number;

  @ApiProperty({
    description: "Raison de l'attribution des points.",
    example: 'Signalement validé',
  })
  @IsString()
  @IsNotEmpty()
  raison: string;
}
