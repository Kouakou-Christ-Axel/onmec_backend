import {
  IsPasswordField,
  IsStrongPassword,
} from 'src/common/decorators/validation.decorators';

export class ChangePasswordDto {
  @IsPasswordField('Mot de passe actuel')
  oldPassword: string;

  @IsStrongPassword('Nouveau mot de passe')
  password: string;
}
