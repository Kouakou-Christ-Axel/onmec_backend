import { Test, TestingModule } from '@nestjs/testing';
import { ActualitesService } from './actualites.service';

describe('ActualitesService', () => {
  let service: ActualitesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActualitesService],
    }).compile();

    service = module.get<ActualitesService>(ActualitesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
