import { IsEmailField } from 'src/common/decorators/validation.decorators';

export class ResendEmailOtpDto {
  @IsEmailField('Adresse email du compte en attente de vérification')
  email: string;
}
