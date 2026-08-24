import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';
import { IsEmailField } from 'src/common/decorators/validation.decorators';

export class AdminLoginDto {
  @IsEmailField('Email du compte back-office')
  email: string;

  @ApiProperty({
    description: 'Mot de passe',
    example: 'MonMotDePasse!2026',
    required: true,
  })
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  password: string;
}
