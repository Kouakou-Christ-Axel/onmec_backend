import { Test, TestingModule } from '@nestjs/testing';
import { LibrairieService } from './librairie.service';

describe('LibrairieService', () => {
  let service: LibrairieService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LibrairieService],
    }).compile();

    service = module.get<LibrairieService>(LibrairieService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
