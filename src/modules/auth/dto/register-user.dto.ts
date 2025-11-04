import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterUserDto {
  @ApiProperty({
    description: "email de l'utilisateur",
    example: 'jean@gmail.com',
    required: true,
    maxLength: 100,
  })
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => value.trim())
  email: string;

  @ApiProperty({
    description: "mot de passe de l'utilisateur",
    example: 'Password01@',
    required: true,
    maxLength: 100,
  })

  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  password: string;

  @ApiProperty({
    description: "nom complet de l'utilisateur",
    example: 'Jean Dupont',
    required: true,
    maxLength: 100,
  })
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => value.trim())
  fullname: string;

  @ApiProperty({
    description: "numéro de téléphone de l'utilisateur",
    example: '+33123456789',
    required: false,
    maxLength: 20,
  })
  @IsOptional()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  phone?: string;
}
  