import { StatutSignalement, User } from '@prisma/client';
import { CategorieSignalementDto } from '../categorie-signalement-dto/categorie-signalement.dto';
import {ApiProperty} from "@nestjs/swagger";
import {Expose, Type} from "class-transformer";
import {IsString, IsUUID, IsNumber, IsEnum, IsBoolean, IsOptional} from "class-validator";

export class SignalementCitoyenDto {
  @ApiProperty({
    description: 'Identifiant unique du signalement',
    example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Titre du signalement',
    example: 'Nid de poule sur la route principale',
  })
  @IsString({
    message: 'Le titre doit être une chaîne de caractères',
  })
  @Expose()
  titre: string;

  @ApiProperty({
    description: 'Description détaillée du signalement',
    example: 'Un grand nid de poule situé au milieu de la chaussée, dangereux pour les véhicules',
  })
  @IsString({
    message: 'La description doit être une chaîne de caractères',
  })
  @Expose()
  description: string;

  @ApiProperty({
    description: 'Identifiant de la catégorie du signalement',
    example: 'c1a2t3e4g5o6r7i8e9-0a1b-2c3d-4e5f-6g7h8i9j0k1l',
  })
  @IsUUID('4', {
    message: 'L\'identifiant de la catégorie doit être un UUID valide',
  })
  @Expose()
  categorieId: string;

  @ApiProperty({
    description: 'Catégorie du signalement',
    type: () => CategorieSignalementDto,
    required: false,
  })
  @Expose()
  categorie?: CategorieSignalementDto;

  @ApiProperty({
    description: 'Indique si le signalement a été validé',
    example: false,
    default: false,
  })
  @IsBoolean({
    message: 'La validation doit être un booléen',
  })
  @Expose()
  @Type(() => Boolean)
  validation: boolean = false;

  @ApiProperty({
    description: 'Adresse du lieu du signalement',
    example: 'Avenue 12, Abidjan, Côte d\'Ivoire',
  })
  @IsString({
    message: 'L\'adresse doit être une chaîne de caractères',
  })
  @Expose()
  adresse: string;

  @ApiProperty({
    description: 'Latitude de la localisation',
    example: 5.3600,
  })
  @IsNumber({}, {
    message: 'La latitude doit être un nombre',
  })
  @Expose()
  latitude: number;

  @ApiProperty({
    description: 'Longitude de la localisation',
    example: -4.0083,
  })
  @IsNumber({}, {
    message: 'La longitude doit être un nombre',
  })
  @Expose()
  longitude: number;

  @ApiProperty({
    description: 'URL de la photo du signalement',
    example: 'https://example.com/photos/signalement.jpg',
    required: false,
  })
  @IsOptional()
  @IsString({
    message: 'La photo doit être une chaîne de caractères',
  })
  @Expose()
  photo?: string;

  @ApiProperty({
    description: 'Statut actuel du signalement',
    enum: StatutSignalement,
    example: StatutSignalement.NOUVEAU,
  })
  @IsEnum(StatutSignalement, {
    message: 'Le statut doit être une valeur valide',
  })
  @Expose()
  statut: StatutSignalement;

  @ApiProperty({
    description: 'Identifiant du citoyen ayant créé le signalement',
    example: 'u1s2e3r4-5i6d-7h8e-9r0e-1a2b3c4d5e6f',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', {
    message: 'L\'identifiant du citoyen doit être un UUID valide',
  })
  @Expose()
  citoyenId?: string;

  @ApiProperty({
    description: 'Informations du citoyen ayant créé le signalement',
    type: () => Object,
    required: false,
  })
  @Expose()
  citoyen?: User;

  @ApiProperty({
    description: 'Date de création du signalement',
    example: '2026-01-29T10:00:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2026-01-29T10:00:00.000Z',
  })
  @Expose()
  updatedAt: Date;

  @ApiProperty({
    description: 'Date de suppression (soft delete)',
    example: null,
    required: false,
  })
  @Expose()
  deletedAt?: Date;
}
