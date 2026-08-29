import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class ModerationListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtre optionnel sur le type de cible des commentaires',
    enum: ['signalement', 'actualite'],
    example: 'signalement',
  })
  @IsOptional()
  @IsIn(['signalement', 'actualite'])
  cible?: 'signalement' | 'actualite';
}
