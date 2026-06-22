import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddPointsDto {
  @ApiProperty({ description: 'Nombre de points à attribuer', example: 50 })
  @IsInt()
  points: number;

  @ApiProperty({ description: "Raison de l'attribution des points", example: 'Quiz complété' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  raison: string;
}
