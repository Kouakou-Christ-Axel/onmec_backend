import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SignalementCitoyenDto } from './signalement-citoyen.dto';

export class CreateSignalementCitoyenDto extends PickType(SignalementCitoyenDto, [
  'titre',
  'description',
  'categorieId',
  'adresse',
  'latitude',
  'longitude',
  'citoyenId',
]) {
  @ApiProperty({
    description:
      "Clé R2 de la photo, obtenue via une demande d'URL présignée préalable (POST /signalement-citoyen/upload-url)",
    required: false,
    example: 'signalements/1732000000000.jpg',
  })
  @IsOptional()
  @IsString({ message: 'photoKey doit être une chaîne de caractères' })
  photoKey?: string;
}
