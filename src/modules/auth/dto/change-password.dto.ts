import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';
import { IsStrongPassword } from 'src/common/decorators/validation.decorators';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mot de passe actuel', required: true })
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  oldPassword: string;

  @IsStrongPassword('Nouveau mot de passe')
  password: string;
}
