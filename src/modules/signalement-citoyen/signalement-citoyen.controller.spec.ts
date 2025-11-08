import { Test, TestingModule } from '@nestjs/testing';
import { SignalementCitoyenController } from './signalement-citoyen.controller';
import { SignalementCitoyenService } from './signalement-citoyen.service';

describe('SignalementCitoyenController', () => {
  let controller: SignalementCitoyenController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SignalementCitoyenController],
      providers: [SignalementCitoyenService],
    }).compile();

    controller = module.get<SignalementCitoyenController>(SignalementCitoyenController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
