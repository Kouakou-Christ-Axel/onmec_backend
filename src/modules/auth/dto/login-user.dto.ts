import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';
import { IsEmailField } from 'src/common/decorators/validation.decorators';

export class LoginUserDto {
  @IsEmailField("Email du compte membre")
  email: string;

  // Pas de contrainte de format ici : la politique s'applique a la creation,
  // pas a la connexion. Un ancien mot de passe plus court doit rester utilisable.
  @ApiProperty({
    description: 'Mot de passe',
    example: 'MonMotDePasse!2026',
    required: true,
  })
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  password: string;
}
