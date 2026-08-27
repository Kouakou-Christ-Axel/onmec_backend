import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UploadUrlResponseDto } from 'src/common/dto/upload-url.dto';

/** Type de fichier demandé lors d'une requête d'URL présignée pour la librairie. */
export enum DocumentUploadKind {
  FICHIER = 'fichier',
  COVER = 'cover',
}

/** Corps de la demande d'URL présignée pour un document ou sa couverture. */
export class UploadDocumentRequestDto {
  @ApiProperty({
    description:
      "Nom du fichier tel qu'il sera envoyé au client (utilisé pour son extension). Pour kind=cover, le front redimensionne et convertit l'image en WebP avant l'upload (ex. couverture.webp).",
    example: 'rapport-annuel.pdf',
  })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    description: 'Type MIME du fichier, figé dans la signature de l’URL présignée',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiProperty({
    description: 'Type de fichier demandé : le document PDF ou sa couverture',
    enum: DocumentUploadKind,
    example: DocumentUploadKind.FICHIER,
  })
  @IsEnum(DocumentUploadKind, {
    message: 'kind doit valoir "fichier" ou "cover"',
  })
  kind: DocumentUploadKind;

  @ApiProperty({
    description:
      "Identifiant de document à réutiliser, pour rattacher la couverture au même dossier que le fichier déjà demandé. Omis lors du premier appel (celui du fichier) : un nouvel identifiant est alors généré.",
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  documentId?: string;
}

export class UploadDocumentResponseDto extends UploadUrlResponseDto {
  @ApiProperty({
    description:
      "Identifiant du dossier R2 (et du futur document) : à repasser en documentId lors de l'upload de la couverture, et retrouvable dans fichierKey/coverKey lors de POST /librairie.",
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  documentId: string;
}
