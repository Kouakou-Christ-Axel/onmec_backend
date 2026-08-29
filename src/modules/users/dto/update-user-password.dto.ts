import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  IsPasswordField,
  IsStrongPassword,
} from 'src/common/decorators/validation.decorators';

export class UpdateUserPasswordDto {
  @IsPasswordField('Mot de passe actuel')
  oldPassword: string;

  @IsStrongPassword('Nouveau mot de passe')
  password: string;

  // Obligatoire : le service compare les deux valeurs, un champ optionnel
  // faisait échouer la comparaison au lieu de valider la saisie.
  @ApiProperty({
    description: 'Confirmation du nouveau mot de passe',
    required: true,
  })
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  confirmPassword: string;
}
