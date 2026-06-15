import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class VerifyEmailOtpDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'jean@citoyen.ci',
  })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({
    description: 'Code OTP à 6 chiffres reçu par email',
    example: '483921',
    minLength: 6,
    maxLength: 6,
  })
  @IsNotEmpty()
  @Length(6, 6)
  @Transform(({ value }) => value?.trim())
  otp: string;
}
