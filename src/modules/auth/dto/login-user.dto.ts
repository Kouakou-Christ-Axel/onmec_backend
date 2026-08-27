import {
  IsEmailField,
  IsPasswordField,
} from 'src/common/decorators/validation.decorators';

export class LoginUserDto {
  @IsEmailField("Email du compte membre")
  email: string;

  // Pas de contrainte de format ici : la politique s'applique a la creation,
  // pas a la connexion. Un ancien mot de passe plus court doit rester utilisable.
  @IsPasswordField('Mot de passe', 'MonMotDePasse!2026')
  password: string;
}
