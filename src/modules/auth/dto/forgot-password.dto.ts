import { IsEmailField } from 'src/common/decorators/validation.decorators';

export class ForgotPasswordDto {
  @IsEmailField('Adresse email du compte à réinitialiser')
  email: string;
}
