import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ResetPasswordDto {
  @ApiProperty({
    description: "Adresse email du compte à réinitialiser",
    example: 'jean.dupont@example.com',
    required: true,
  })
  @IsNotEmpty()
  @IsEmail({}, { message: 'Adresse email invalide' })
  @Transform(({ value }) => value?.trim())
  email: string;

  @ApiProperty({
    description: 'Code de réinitialisation reçu par email (6 chiffres)',
    example: '123456',
    required: true,
  })
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  otp: string;

  @ApiProperty({
    description: 'Nouveau mot de passe',
    example: 'Password01@',
    required: true,
    maxLength: 15,
  })
  @IsNotEmpty()
  @MaxLength(15)
  @Transform(({ value }) => value?.trim())
  @Matches(
    /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;':\".,<>?/\\])[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;':\".,<>?/\\]{8,}$/,
    {
      message:
        'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.',
    },
  )
  password: string;
}
