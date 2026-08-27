import { Test, TestingModule } from '@nestjs/testing';
import { QuizzService } from './quizz.service';
import { PrismaService } from '../../database/services/prisma.service';
import { GamificationService } from '../gamification/gamification.service';

describe('QuizzService', () => {
  let service: QuizzService;

  const prismaMock = {
    quiz: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    userQuiz: { create: jest.fn(), findMany: jest.fn() },
  };

  // Le service credite des points a la completion d'un quiz.
  const gamificationMock = {
    attribuerSansEchouer: jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: GamificationService, useValue: gamificationMock },
      ],
    }).compile();

    service = module.get<QuizzService>(QuizzService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
