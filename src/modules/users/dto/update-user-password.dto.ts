import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserPasswordDto {
  // OLD PASSWORD
  @ApiProperty({
    description: "le mot de passe actuel de l'utilisateur",
    example: 'Password01@',
    required: true,
    maxLength: 15,
  })
  @IsNotEmpty()
  @MaxLength(15)
  @Transform(({ value }) => value?.trim())
  oldPassword: string;

  // PASSWORD
  @ApiProperty({
    description: "le mot de passe de l'utilisateur",
    example: 'Password01@',
    required: true,
    maxLength: 15,
  })
  @IsNotEmpty()
  @MaxLength(15)
  @Transform(({ value }) => value?.trim())
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;':\".,<>?/\\])[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;':\".,<>?/\\]{8,}$/, {
    message:
      'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.',
  })
  password: string;

  // CONFIRM PASSWORD
  @ApiProperty({
    description: "la confirmation du mot de passe de l'utilisateur",
    example: 'Password01@',
    required: false,
    maxLength: 15,
  })
  @IsOptional()
  @MaxLength(15)
  @Transform(({ value }) => value?.trim())
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;':\".,<>?/\\])[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;':\".,<>?/\\]{8,}$/, {
    message:
      'La confirmation du mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.',
  })
  confirmPassword: string;
}
