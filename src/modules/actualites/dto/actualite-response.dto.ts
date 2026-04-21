// src/modules/actualites/dto/actualite-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActualiteResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'inauguration-du-nouveau-pont' })
  slug: string;

  @ApiProperty({ example: 'Inauguration du nouveau pont d\'Abidjan' })
  title: string;

  @ApiProperty({ example: 'Le nouveau pont a été officiellement inauguré ce matin.' })
  excerpt: string;

  @ApiProperty({ example: '<p>Le nouveau pont reliant le plateau à Treichville...</p>' })
  content: string;

  @ApiProperty({ example: '2026-04-21T08:00:00.000Z' })
  date: Date;

  @ApiPropertyOptional({ example: '/uploads/actualites/pont-abidjan.jpg' })
  imageUrl?: string | null;

  @ApiProperty({ example: '2026-04-21T09:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-21T09:00:00.000Z' })
  updatedAt: Date;
}
