import { Test, TestingModule } from '@nestjs/testing';
import { SignalementCitoyenService } from './signalement-citoyen.service';

describe('SignalementCitoyenService', () => {
  let service: SignalementCitoyenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignalementCitoyenService],
    }).compile();

    service = module.get<SignalementCitoyenService>(SignalementCitoyenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
