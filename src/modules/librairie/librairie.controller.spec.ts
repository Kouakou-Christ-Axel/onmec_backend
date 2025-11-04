import { Test, TestingModule } from '@nestjs/testing';
import { LibrairieController } from './librairie.controller';
import { LibrairieService } from './librairie.service';

describe('LibrairieController', () => {
  let controller: LibrairieController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibrairieController],
      providers: [LibrairieService],
    }).compile();

    controller = module.get<LibrairieController>(LibrairieController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
