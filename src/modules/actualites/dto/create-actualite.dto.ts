import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateActualiteDto {
  // `@Type(() => Date)` est nécessaire : JSON ne transporte pas de type Date,
  // la valeur arrive en chaîne de caractères ISO.
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

  // Obligatoire a la redaction, bien que la colonne soit nullable en base :
  // la nullabilite n'existe que pour ne pas emporter les actualites quand une
  // categorie est supprimee, et pour l'existant repris par la migration.
  @ApiProperty({
    description: "Identifiant de la catégorie éditoriale de l'actualité",
    example: '20000000-0000-0000-0000-000000000001',
  })
  @IsUUID()
  categorieId: string;

  // Requete multipart : le front envoie soit `tags` repete, soit une chaine
  // separee par des virgules. Le @Transform accepte les deux, sans quoi un
  // `tags=sante,education` unique arriverait comme un seul tag « sante,education ».
  @ApiPropertyOptional({
    description:
      "Tags libres de l'actualité. Répéter le champ, ou séparer par des virgules. Les tags inconnus sont créés.",
    example: ['Santé', 'Infrastructure'],
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const brut = Array.isArray(value) ? value : String(value).split(',');
    const propres = brut.map((t) => String(t).trim()).filter(Boolean);
    return propres.length ? propres : undefined;
  })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @ArrayMaxSize(10)
  tags?: string[];

  @ApiPropertyOptional({
    description:
      "Clé R2 de l'image de couverture, obtenue via une demande d'URL présignée préalable",
    example: 'actualites/contenu/1732000000000.jpg',
  })
  @IsOptional()
  @IsString()
  imageKey?: string;
}
