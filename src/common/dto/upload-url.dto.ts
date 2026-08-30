import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Corps commun d'une demande d'URL présignée : le client annonce le fichier,
 * le backend signe un PUT direct vers R2 sans jamais recevoir les octets.
 *
 * Chaque module en dérive une classe vide pour garder son propre nom de schéma
 * dans `docs/openapi.json` — la forme, elle, est identique partout.
 */
export class UploadUrlRequestDto {
  @ApiProperty({
    description:
      "Nom du fichier tel qu'il sera envoyé au client (utilisé pour son extension). Le front redimensionne et convertit les images en WebP avant l'upload.",
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

export class UploadUrlResponseDto {
  @ApiProperty({ description: 'Clé objet R2 générée côté serveur' })
  key: string;

  @ApiProperty({ description: 'URL PUT présignée vers laquelle envoyer le fichier' })
  uploadUrl: string;

  @ApiProperty({ description: "Durée de validité de l'URL présignée, en secondes" })
  expiresIn: number;
}
