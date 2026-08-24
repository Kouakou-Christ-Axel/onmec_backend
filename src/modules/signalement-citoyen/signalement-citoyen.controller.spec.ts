import { Test, TestingModule } from '@nestjs/testing';
import { SignalementCitoyenController } from './signalement-citoyen.controller';
import { SignalementCitoyenService } from './signalement-citoyen.service';

describe('SignalementCitoyenController', () => {
  let controller: SignalementCitoyenController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SignalementCitoyenController],
      // Mocke : le service reel tire PrismaService, EngagementService,
      // GamificationService et NotificationService.
      providers: [{ provide: SignalementCitoyenService, useValue: {} }],
    }).compile();

    controller = module.get<SignalementCitoyenController>(
      SignalementCitoyenController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
