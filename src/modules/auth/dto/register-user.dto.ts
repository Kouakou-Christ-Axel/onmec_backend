import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  IsEmailField,
  IsStrongPassword,
} from 'src/common/decorators/validation.decorators';

export class RegisterUserDto {
  @IsEmailField("Email de l'utilisateur")
  email: string;

  @IsStrongPassword("Mot de passe de l'utilisateur")
  password: string;

  @ApiProperty({
    description: "nom complet de l'utilisateur",
    example: 'Jean Dupont',
    required: true,
    maxLength: 100,
  })
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullname: string;

  @ApiProperty({
    description: "numéro de téléphone de l'utilisateur",
    example: '+2250701020304',
    required: false,
    maxLength: 20,
  })
  @IsOptional()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phone?: string;
}
