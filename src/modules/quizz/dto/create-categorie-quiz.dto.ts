import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateCategorieQuizDto {
  @ApiProperty({ description: 'Nom de la catégorie', example: 'Géographie' })
  @IsString()
  nom: string;

  @ApiPropertyOptional({ description: 'Description de la catégorie', example: 'Quiz sur la géographie africaine' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCategorieQuizDto extends PartialType(CreateCategorieQuizDto) {}
