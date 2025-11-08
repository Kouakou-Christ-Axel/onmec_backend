import { PickType } from '@nestjs/swagger';
import { SignalementCitoyenDto } from './signalement-citoyen.dto';

export class CreateSignalementCitoyenDto extends PickType(SignalementCitoyenDto, [
  'titre',
  'description',
  'categorieId',
  'adresse',
  'latitude',
  'longitude',
  'photo',
  'citoyenId',
  'statut'
]) {}
