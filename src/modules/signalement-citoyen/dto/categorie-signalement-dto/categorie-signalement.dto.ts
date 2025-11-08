import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CategorieSignalementDto {
  @ApiProperty({
    description: 'Nom de la catégorie de signalement',
    example: 'Voirie',
  })
  @IsString()
  nom: string;

  @ApiProperty({
    description: 'Description de la catégorie de signalement',
    example: 'Problèmes liés à la voirie, comme les nids-de-poule ou les trottoirs endommagés',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "Indique si la validation est obligatoire pour cette catégorie de signalement",
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  validationObligatoire: boolean;
}