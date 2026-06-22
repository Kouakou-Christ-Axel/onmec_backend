import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @ApiProperty({
    description: "Adresse email du compte à réinitialiser",
    example: 'jean.dupont@example.com',
    required: true,
  })
  @IsNotEmpty()
  @IsEmail({}, { message: 'Adresse email invalide' })
  @Transform(({ value }) => value?.trim())
  email: string;
}
