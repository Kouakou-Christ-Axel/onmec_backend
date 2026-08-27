import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  IsEmailField,
  IsStrongPassword,
} from 'src/common/decorators/validation.decorators';

export class ResetPasswordDto {
  @IsEmailField('Adresse email du compte à réinitialiser')
  email: string;

  @ApiProperty({
    description: 'Code de réinitialisation reçu par email (6 chiffres)',
    example: '123456',
    required: true,
  })
  @IsNotEmpty()
  @Length(6, 6)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  otp: string;

  @IsStrongPassword('Nouveau mot de passe')
  password: string;
}
