import { StatutSignalement, User } from '@prisma/client';
import { CategorieSignalementDto } from '../categorie-signalement-dto/categorie-signalement.dto';

export class SignalementCitoyenDto {
  id: string;
  titre: string;
  description: string;

  categorieId: string;
  categorie?: CategorieSignalementDto;
  validation: boolean;

  adresse: string;
  latitude: number;
  longitude: number;

  photo?: string;

  statut: StatutSignalement;

  citoyenId?: string;
  citoyen?: User;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
