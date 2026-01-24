import { ApiProperty } from '@nestjs/swagger';

export class DocumentResponseDto {
  @ApiProperty({ description: "ID du document", example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ description: "Titre du document", example: "Le Petit Prince" })
  title: string;

  @ApiProperty({ description: "Description du document", example: "Un conte philosophique et poétique", nullable: true })
  description: string | null;

  @ApiProperty({ description: "Type de fichier", example: ".pdf" })
  fileType: string;

  @ApiProperty({ description: "URL pour télécharger le fichier", example: "/api/v1/librairie/550e8400-e29b-41d4-a716-446655440000/file" })
  fileUrl: string;

  @ApiProperty({ description: "URL de la couverture", example: "/uploads/librairie/550e8400-e29b-41d4-a716-446655440000/cover.jpg", nullable: true })
  coverImage: string | null;

  @ApiProperty({ description: "Date d'upload", example: "2026-01-24T10:30:00Z" })
  uploadedAt: Date;

  @ApiProperty({ description: "Informations de l'utilisateur ayant uploadé", type: Object })
  uploadedBy: {
    id: string;
    fullname: string;
    email: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
