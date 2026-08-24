import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Champs modifiables d'un profil membre.
 *
 * Déclaré explicitement, et NON `PartialType(CreateUserDto)` : l'héritage
 * ramenait tout nouveau champ de création dans la surface de modification —
 * c'est ainsi que `role` devenait modifiable par son propre porteur.
 *
 * L'email n'est pas modifiable ici : il sert d'identifiant de connexion, son
 * changement doit repasser par une vérification.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Nom complet', example: 'Jean Dupont' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullname?: string;

  @ApiPropertyOptional({
    description: 'Numéro de téléphone',
    example: '+2250707070707',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phone?: string;

  @ApiPropertyOptional({ description: 'Avatar', type: 'file' as 'string' })
  @IsOptional()
  image?: string;
}
