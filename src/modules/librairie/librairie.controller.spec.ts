import { Test, TestingModule } from '@nestjs/testing';
import { LibrairieController } from './librairie.controller';
import { LibrairieService } from './librairie.service';

describe('LibrairieController', () => {
  let controller: LibrairieController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibrairieController],
      // Le service est mocke : le fournir reellement obligerait a instancier
      // PrismaService et ConfigService, ce qui faisait echouer la compilation
      // du module de test.
      providers: [{ provide: LibrairieService, useValue: {} }],
    }).compile();

    controller = module.get<LibrairieController>(LibrairieController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
