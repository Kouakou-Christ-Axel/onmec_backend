import {
  IsEmailField,
  IsPasswordField,
} from 'src/common/decorators/validation.decorators';

export class AdminLoginDto {
  @IsEmailField('Email du compte back-office')
  email: string;

  @IsPasswordField('Mot de passe', 'MonMotDePasse!2026')
  password: string;
}
