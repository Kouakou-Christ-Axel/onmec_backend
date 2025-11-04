import { Test, TestingModule } from '@nestjs/testing';
import { SimpleStorageService } from './simple-storage.service';

describe('SimpleStorageServiceService', () => {
  let service: SimpleStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SimpleStorageService],
    }).compile();

    service = module.get<SimpleStorageService>(SimpleStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
