import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSignalementUpdateDto {
  @ApiProperty({
    description: 'Texte de la mise à jour, visible par le citoyen',
    example: 'Une équipe a été dépêchée sur place, intervention prévue sous 48h.',
  })
  @IsString({ message: 'Le texte doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le texte ne peut pas être vide' })
  texte: string;
}
