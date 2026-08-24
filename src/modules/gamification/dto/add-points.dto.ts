import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AddPointsDto {
  @ApiPropertyOptional({
    description:
      "Identifiant du membre destinataire. Omis, les points vont au compte appelant.",
    example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

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
