import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

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
    description: 'ID de l\'utilisateur propriétaire du document',
    example: 1,
  })
  @IsOptional()
  userId?: string;
}

export interface DocumentFilesDto {
  covers?: Express.Multer.File[];
  fichiers?: Express.Multer.File[];
}
