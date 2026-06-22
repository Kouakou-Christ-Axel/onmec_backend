import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class AddPointsDto {
  @ApiProperty({
    description: "Nombre de points à attribuer (peut être positif).",
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
