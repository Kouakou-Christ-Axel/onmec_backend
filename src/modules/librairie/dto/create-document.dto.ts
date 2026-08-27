import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({
    description: 'Titre du document',
    example: 'Le Petit Prince',
  })
  @IsString({
    message: 'Le titre doit être une chaîne de caractères',
  })
  title: string;

  @ApiProperty({
    description: 'Description du document',
    example: 'Un conte philosophique et poétique',
  })
  @IsString({
    message: 'La description doit être une chaîne de caractères',
  })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Catégorie du document',
    example: 'Budget',
    required: false,
  })
  @IsString({
    message: 'La catégorie doit être une chaîne de caractères',
  })
  @IsOptional()
  categorie?: string;

  @ApiProperty({
    description: 'ID de l\'utilisateur propriétaire du document',
    example: 1,
  })
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description:
      "Clé R2 du fichier PDF, obtenue via POST /librairie/upload-url (kind: 'fichier')",
    example: 'librairie/550e8400-e29b-41d4-a716-446655440000/fichier.pdf',
  })
  @IsString({ message: 'fichierKey doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'fichierKey est requis' })
  fichierKey: string;

  @ApiProperty({
    description:
      "Clé R2 de la couverture, obtenue via POST /librairie/upload-url (kind: 'cover')",
    example: 'librairie/550e8400-e29b-41d4-a716-446655440000/cover.jpg',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'coverKey doit être une chaîne de caractères' })
  coverKey?: string;
}

export interface DocumentFilesDto {
  covers?: Express.Multer.File[];
  fichiers?: Express.Multer.File[];
}
