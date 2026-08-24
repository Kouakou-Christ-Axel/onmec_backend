import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategorieActualiteDto {
  @ApiProperty({
    description: 'Nom affiché de la catégorie',
    example: 'Infrastructure',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nom: string;

  @ApiPropertyOptional({
    description: 'Description éditoriale de la catégorie',
    example: 'Routes, ponts, adduction d’eau et équipements publics.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

// Le slug n'est pas modifiable : il sert d'identifiant stable dans les URL du
// front. Renommer une catégorie change son libellé, pas son adresse.
export class UpdateCategorieActualiteDto extends PartialType(
  CreateCategorieActualiteDto,
) {}

export class CategorieActualiteResponseDto {
  @ApiProperty({ example: '20000000-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ example: 'Infrastructure' })
  nom: string;

  @ApiProperty({ example: 'infrastructure' })
  slug: string;

  @ApiProperty({ nullable: true, example: 'Routes, ponts et équipements.' })
  description: string | null;

  @ApiProperty({
    description: "Nombre d'actualités publiées et non supprimées classées ici",
    example: 12,
  })
  actualitesCount: number;
}

export class TagActualiteResponseDto {
  @ApiProperty({ example: '30000000-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ example: 'Santé' })
  nom: string;

  @ApiProperty({ example: 'sante' })
  slug: string;

  @ApiProperty({
    description: "Nombre d'actualités publiées et non supprimées portant ce tag",
    example: 4,
  })
  actualitesCount: number;
}
