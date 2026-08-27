import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Corps de la demande d'URL présignée pour une image du corps d'un article. */
export class UploadImageRequestDto {
  @ApiProperty({
    description: "Nom du fichier tel qu'il sera envoyé au client (utilisé pour son extension)",
    example: 'photo.jpg',
  })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    description: 'Type MIME du fichier, figé dans la signature de l’URL présignée',
    example: 'image/jpeg',
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}

export class UploadImageResponseDto {
  @ApiProperty({ description: 'Clé objet R2 générée côté serveur' })
  key: string;

  @ApiProperty({ description: 'URL PUT présignée vers laquelle envoyer le fichier' })
  uploadUrl: string;

  @ApiProperty({ description: "Durée de validité de l'URL présignée, en secondes" })
  expiresIn: number;
}
