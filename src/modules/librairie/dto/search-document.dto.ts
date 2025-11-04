import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SearchDocumentDto {
  @ApiProperty({
    description: 'Titre du document à rechercher',
    example: 'Le Petit Prince',
  })
  @IsString({
    message: 'Le titre doit être une chaîne de caractères',
  })
  @IsOptional()
  title?: string;
}