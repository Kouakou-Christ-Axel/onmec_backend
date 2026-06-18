import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendEmailOtpDto {
  @ApiProperty({
    description: "Adresse email du compte en attente de vérification",
    example: 'jean@citoyen.ci',
  })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;
}
