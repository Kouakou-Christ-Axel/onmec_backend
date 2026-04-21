// src/modules/users/dto/user-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Jean Dupont' })
  fullname: string;

  @ApiProperty({ example: 'jean.dupont@mec-ci.org' })
  email: string;

  @ApiPropertyOptional({ example: '+2250707070707' })
  phone?: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.MEMBER })
  role: UserRole;

  @ApiPropertyOptional({ example: '/uploads/users-avatar/u1b2c3d4.jpg' })
  image?: string | null;

  @ApiPropertyOptional({ example: 'Cocody, Abidjan' })
  address?: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: null })
  deletedAt?: Date | null;
}
