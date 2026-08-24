import { Module } from '@nestjs/common';
import { ActualitesService } from './actualites.service';
import { ActualitesController } from './actualites.controller';
import { EngagementModule } from '../engagement/engagement.module';
import { TaxonomieService } from './taxonomie/taxonomie.service';
import {
  CategorieActualiteController,
  TagActualiteController,
} from './taxonomie/taxonomie.controller';

@Module({
  imports: [EngagementModule],
  controllers: [
    ActualitesController,
    CategorieActualiteController,
    TagActualiteController,
  ],
  providers: [ActualitesService, TaxonomieService],
})
export class ActualitesModule {}
