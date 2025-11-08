import { Module } from '@nestjs/common';
import { SignalementCitoyenService } from './signalement-citoyen.service';
import { SignalementCitoyenController } from './signalement-citoyen.controller';
import { CategorieSignalementController } from './categorie-signalement/categorie-signalement.controller';
import { CategorieSignalementService } from './categorie-signalement/categorie-signalement.service';

@Module({
  controllers: [SignalementCitoyenController, CategorieSignalementController],
  providers: [SignalementCitoyenService, CategorieSignalementService],
})
export class SignalementCitoyenModule {}
