import { Test, TestingModule } from '@nestjs/testing';
import { QuizzController } from './quizz.controller';
import { QuizzService } from './quizz.service';

describe('QuizzController', () => {
  let controller: QuizzController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizzController],
      // Mocke : le service reel tire PrismaService et GamificationService.
      providers: [{ provide: QuizzService, useValue: {} }],
    }).compile();

    controller = module.get<QuizzController>(QuizzController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
