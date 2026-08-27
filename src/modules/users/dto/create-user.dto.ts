import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, MaxLength, IsOptional, IsString } from 'class-validator';
import { IsEmailField } from 'src/common/decorators/validation.decorators';

/**
 * Création d'un compte membre depuis le back-office.
 *
 * Ne porte PLUS de champ `role` : c'était le vecteur d'élévation de privilèges
 * (via `UpdateUserDto extends PartialType(CreateUserDto)`), et les comptes
 * back-office vivent désormais dans une table séparée.
 *
 * Ne porte plus non plus `address` : ce champ n'existe pas sur le modèle
 * Prisma, il partait dans un spread vers `prisma.create` et faisait échouer
 * la requête dès qu'il était renseigné.
 */
export class CreateUserDto {
  @ApiProperty({
    description: "Nom complet de l'utilisateur",
    example: 'Jean Dupont',
    required: true,
    maxLength: 100,
  })
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullname: string;

  @IsEmailField("Email de l'utilisateur")
  email: string;

  @ApiProperty({
    description: "Numéro de téléphone de l'utilisateur",
    example: '+2250707070707',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phone?: string;

  @ApiProperty({
    description:
      "Clé R2 de l'avatar, obtenue via une demande d'URL présignée préalable (POST /users/avatar/upload-url)",
    required: false,
    example: 'users-avatar/1732000000000.jpg',
  })
  @IsOptional()
  @IsString()
  avatarKey?: string;
}
