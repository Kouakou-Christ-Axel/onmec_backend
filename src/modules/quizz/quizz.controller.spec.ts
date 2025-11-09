import { Test, TestingModule } from '@nestjs/testing';
import { QuizzController } from './quizz.controller';
import { QuizzService } from './quizz.service';

describe('QuizzController', () => {
  let controller: QuizzController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizzController],
      providers: [QuizzService],
    }).compile();

    controller = module.get<QuizzController>(QuizzController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
