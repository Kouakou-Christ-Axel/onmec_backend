import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCommentaireDto {
  @ApiProperty({
    description: 'Contenu textuel du commentaire',
    example: 'Merci pour ce signalement, situation prise en compte.',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  contenu: string;
}
