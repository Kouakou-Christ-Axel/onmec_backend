import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Corps de la demande d'URL présignée pour la photo d'un signalement. */
export class UploadSignalementPhotoRequestDto {
  @ApiProperty({
    description: "Nom du fichier tel qu'il sera envoyé au client (utilisé pour son extension). Le front redimensionne et convertit les images en WebP avant l'upload.",
    example: 'photo.webp',
  })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    description: 'Type MIME du fichier, figé dans la signature de l’URL présignée',
    example: 'image/webp',
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}

export class UploadSignalementPhotoResponseDto {
  @ApiProperty({ description: 'Clé objet R2 générée côté serveur' })
  key: string;

  @ApiProperty({ description: 'URL PUT présignée vers laquelle envoyer le fichier' })
  uploadUrl: string;

  @ApiProperty({ description: "Durée de validité de l'URL présignée, en secondes" })
  expiresIn: number;
}
