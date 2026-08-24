import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateActualiteDto {
  // `@Type(() => Date)` est nécessaire : la requête est en multipart, donc
  // tous les champs arrivent en chaîne de caractères.
  @ApiProperty({
    description: "Date de l'actualité",
    example: '2026-10-15T14:48:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  date: Date;

  @ApiProperty({
    description: "Titre de l'actualité",
    example: 'Inauguration du nouveau pont',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: "Extrait de l'actualité",
    example: 'Le nouveau pont a été officiellement inauguré ce matin.',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  excerpt: string;

  @ApiProperty({
    description: "Contenu complet de l'actualité",
    example: '<p>Le nouveau pont reliant le Plateau à Treichville…</p>',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  // Déclaré uniquement pour que Swagger expose le champ fichier : la valeur
  // est lue par FileInterceptor, pas par le corps de requête.
  @ApiProperty({
    description: "Image de couverture de l'actualité",
    required: false,
    type: 'file' as 'string',
  })
  @IsOptional()
  image?: any;
}
