import { ApiProperty } from '@nestjs/swagger';

export class PaginatedMetaDto {
  @ApiProperty({ description: 'Nombre total d\'éléments', example: 100 })
  total: number;

  @ApiProperty({ description: 'Page courante', example: 1 })
  page: number;

  @ApiProperty({ description: 'Nombre d\'éléments par page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Nombre total de pages', example: 10 })
  totalPages: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({ type: () => PaginatedMetaDto })
  meta: PaginatedMetaDto;
}
