import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, Length } from 'class-validator';
import { IsEmailField } from 'src/common/decorators/validation.decorators';

export class VerifyEmailOtpDto {
  @IsEmailField("Adresse email de l'utilisateur")
  email: string;

  @ApiProperty({
    description: 'Code OTP à 6 chiffres reçu par email',
    example: '483921',
    minLength: 6,
    maxLength: 6,
  })
  @IsNotEmpty()
  @Length(6, 6)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  otp: string;
}
