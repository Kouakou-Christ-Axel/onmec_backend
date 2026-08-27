import { Test, TestingModule } from '@nestjs/testing';
import { ActualitesController } from './actualites.controller';
import { ActualitesService } from './actualites.service';

describe('ActualitesController', () => {
  let controller: ActualitesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActualitesController],
      // Le service est mocké : le fournir réellement obligerait à instancier
      // PrismaService, ConfigService et EngagementService, ce qui faisait
      // échouer la compilation du module de test.
      providers: [{ provide: ActualitesService, useValue: {} }],
    }).compile();

    controller = module.get<ActualitesController>(ActualitesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
