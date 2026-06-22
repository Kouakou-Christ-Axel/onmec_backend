import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class MasquerCommentaireDto {
  @ApiProperty({
    description: 'true pour masquer le commentaire, false pour le rendre à nouveau visible',
    example: true,
  })
  @IsBoolean()
  masque: boolean;
}
