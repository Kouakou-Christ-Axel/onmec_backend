import { ApiProperty } from '@nestjs/swagger';

export class ResetUserPasswordResponseDto {
  @ApiProperty({
    description: "Email de l'utilisateur",
    example: 'Jean Dupont',
    required: true,
  })
  email: string;

  @ApiProperty({
    description: "Mot de passe de l'utilisateur",
    example: 'Jean Dupont',
    required: true,
  })
  password: string;
}
