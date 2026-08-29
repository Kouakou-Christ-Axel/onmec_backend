import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuizzService } from './quizz.service';
import { PrismaService } from '../../database/services/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { AdminRole } from '../../generated/prisma/client';
import {
  AuthenticatedActor,
  MEMBER_ROLE,
} from '../../common/types/authenticated-actor';

describe('QuizzService', () => {
  let service: QuizzService;

  const quizMock = {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateMany: jest.fn(),
  };
  const userQuizMock = {
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  };
  const categorieQuizMock = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const questionMock = {
    deleteMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  };
  const choiceMock = { deleteMany: jest.fn() };
  const userAnswerMock = { deleteMany: jest.fn() };

  // Objet transmis au callback de `$transaction(async (tx) => ...)` : mêmes
  // jest.fn() que prismaMock, pour pouvoir asserter les appels directement.
  const txMock = {
    quiz: quizMock,
    userQuiz: userQuizMock,
    categorieQuiz: categorieQuizMock,
    question: questionMock,
    choice: choiceMock,
    userAnswer: userAnswerMock,
  };

  const prismaMock = {
    quiz: quizMock,
    userQuiz: userQuizMock,
    categorieQuiz: categorieQuizMock,
    question: questionMock,
    choice: choiceMock,
    userAnswer: userAnswerMock,
    // Gère les deux formes utilisées par le service : tableau de promesses
    // ($transaction([...])) et callback transactionnel ($transaction(async tx => ...)).
    $transaction: jest.fn((arg: unknown) =>
      Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(txMock),
    ),
  };

  const gamificationMock = {
    attribuer: jest.fn(),
  };

  const actor = (type: 'admin' | 'member'): AuthenticatedActor =>
    ({
      id: 'actor-1',
      type,
      role: type === 'admin' ? AdminRole.ADMIN_NATIONAL : MEMBER_ROLE,
      email: 'x@y.z',
      fullname: 'X',
      phone: null,
      avatar: null,
    }) as AuthenticatedActor;

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

  // 1. isCorrect conditionnel ────────────────────────────────────────────────
  describe('isCorrect conditionnel', () => {
    const attachIsCorrect = (quiz: unknown) => (service as any).attachIsCorrect(quiz);

    it('attachIsCorrect marque uniquement le choix correspondant à correctId', () => {
      const quiz = {
        questions: [
          {
            correctId: 'choice-2',
            choices: [{ id: 'choice-1' }, { id: 'choice-2' }],
          },
        ],
      };

      const result = attachIsCorrect(quiz);

      expect(result.questions[0].choices).toEqual([
        { id: 'choice-1', isCorrect: false },
        { id: 'choice-2', isCorrect: true },
      ]);
    });

    describe('findOne', () => {
      const baseQuiz = {
        id: 'quiz-1',
        title: 'Quiz',
        questions: [
          {
            correctId: 'choice-2',
            choices: [{ id: 'choice-1' }, { id: 'choice-2' }],
          },
        ],
      };

      beforeEach(() => {
        quizMock.findUnique.mockResolvedValue(baseQuiz);
        userQuizMock.aggregate.mockResolvedValue({ _count: 0, _avg: { score: null } });
      });

      it('admin : les choix exposent isCorrect', async () => {
        const result = await service.findOne('quiz-1', actor('admin'));
        expect(result!.questions[0].choices[0]).toHaveProperty('isCorrect');
      });

      it('membre : les choix n\'exposent pas isCorrect', async () => {
        const result = await service.findOne('quiz-1', actor('member'));
        expect(result!.questions[0].choices[0]).not.toHaveProperty('isCorrect');
      });

      it('acteur non fourni : les choix n\'exposent pas isCorrect', async () => {
        const result = await service.findOne('quiz-1');
        expect(result!.questions[0].choices[0]).not.toHaveProperty('isCorrect');
      });
    });
  });

  // 2. GET /quizz/results → getAllResults ─────────────────────────────────────
  describe('getAllResults', () => {
    it('reshape chaque tentative en {id, userId, userNom, quizId, quizTitre, score, completedAt}', async () => {
      const completedAt = new Date('2026-01-01T00:00:00Z');
      userQuizMock.findMany.mockResolvedValue([
        {
          id: 'uq-1',
          userId: 'user-1',
          quizId: 'quiz-1',
          score: 80,
          completedAt,
          user: { fullname: 'Awa Koné' },
          quiz: { title: 'Quiz Civisme' },
        },
      ]);
      userQuizMock.count.mockResolvedValue(1);

      const result = await service.getAllResults();

      expect(result.data[0]).toEqual({
        id: 'uq-1',
        userId: 'user-1',
        quizId: 'quiz-1',
        userNom: 'Awa Koné',
        quizTitre: 'Quiz Civisme',
        score: 80,
        completedAt,
      });
      expect(result.data[0]).not.toHaveProperty('user');
      expect(result.data[0]).not.toHaveProperty('quiz');
    });

    it('transmet quizId dans le where transmis à findMany', async () => {
      userQuizMock.findMany.mockResolvedValue([]);
      userQuizMock.count.mockResolvedValue(0);

      await service.getAllResults({ quizId: 'quiz-42' });

      expect(userQuizMock.findMany.mock.calls[0][0].where).toEqual({ quizId: 'quiz-42' });
    });
  });

  // 3. totalAttempts / averageScore ───────────────────────────────────────────
  describe('totalAttempts / averageScore', () => {
    it('findAll associe les stats groupBy au bon quiz et met 0 pour les quiz sans tentative', async () => {
      quizMock.findMany.mockResolvedValue([
        { id: 'quiz-1', title: 'Quiz 1' },
        { id: 'quiz-2', title: 'Quiz 2' },
      ]);
      quizMock.count.mockResolvedValue(2);
      userQuizMock.groupBy.mockResolvedValue([
        { quizId: 'quiz-1', _count: 3, _avg: { score: 66.6 } },
      ]);

      const result = await service.findAll();

      const quiz1 = result.data.find((q: any) => q.id === 'quiz-1');
      const quiz2 = result.data.find((q: any) => q.id === 'quiz-2');
      expect(quiz1).toMatchObject({ totalAttempts: 3, averageScore: 67 });
      expect(quiz2).toMatchObject({ totalAttempts: 0, averageScore: 0 });
    });

    it('findOne expose totalAttempts et averageScore depuis aggregate', async () => {
      quizMock.findUnique.mockResolvedValue({ id: 'quiz-1', title: 'Quiz', questions: [] });
      userQuizMock.aggregate.mockResolvedValue({ _count: 5, _avg: { score: 80 } });

      const result = await service.findOne('quiz-1');

      expect(result!.totalAttempts).toBe(5);
      expect(result!.averageScore).toBe(80);
    });
  });

  // 4. quizCount sur les catégories ───────────────────────────────────────────
  describe('quizCount sur les catégories', () => {
    it('findAllCategories expose quizCount et retire _count', async () => {
      categorieQuizMock.findMany.mockResolvedValue([
        { id: 'cat-1', nom: 'Cat 1', _count: { quizzes: 3 } },
        { id: 'cat-2', nom: 'Cat 2', _count: { quizzes: 0 } },
      ]);

      const result = await service.findAllCategories();

      expect(result[0]).toEqual({ id: 'cat-1', nom: 'Cat 1', quizCount: 3 });
      expect(result[0]).not.toHaveProperty('_count');
      expect(result[1].quizCount).toBe(0);
    });

    it('createCategorie renvoie quizCount: 0', async () => {
      categorieQuizMock.create.mockResolvedValue({ id: 'cat-1', nom: 'Cat 1' });

      const result = await service.createCategorie({ nom: 'Cat 1' } as any);

      expect(result.quizCount).toBe(0);
    });

    it('updateCategorie réutilise le quizCount de findOneCategorie sans nouveau comptage', async () => {
      categorieQuizMock.findUnique.mockResolvedValue({
        id: 'cat-1',
        nom: 'Ancien nom',
        _count: { quizzes: 4 },
      });
      categorieQuizMock.update.mockResolvedValue({ id: 'cat-1', nom: 'Nouveau nom' });

      const result = await service.updateCategorie('cat-1', { nom: 'Nouveau nom' } as any);

      expect(result.quizCount).toBe(4);
      expect(categorieQuizMock.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  // 5. removeCategorie avec reassignTo ────────────────────────────────────────
  describe('removeCategorie avec reassignTo', () => {
    it('rejette reassignTo === id sans appeler delete', async () => {
      categorieQuizMock.findUnique.mockResolvedValue({
        id: 'cat-1',
        nom: 'Cat 1',
        _count: { quizzes: 0 },
      });

      await expect(service.removeCategorie('cat-1', 'cat-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(categorieQuizMock.delete).not.toHaveBeenCalled();
    });

    it('rejette une catégorie de réaffectation inexistante', async () => {
      categorieQuizMock.findUnique
        .mockResolvedValueOnce({ id: 'cat-1', nom: 'Cat 1', _count: { quizzes: 0 } })
        .mockResolvedValueOnce(null);

      await expect(service.removeCategorie('cat-1', 'cat-missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('réaffecte les quiz puis supprime la catégorie, dans la même transaction', async () => {
      categorieQuizMock.findUnique
        .mockResolvedValueOnce({ id: 'cat-1', nom: 'Cat 1', _count: { quizzes: 2 } })
        .mockResolvedValueOnce({ id: 'cat-2', nom: 'Cat 2', _count: { quizzes: 0 } });

      const callOrder: string[] = [];
      quizMock.updateMany.mockImplementation(async () => {
        callOrder.push('updateMany');
      });
      categorieQuizMock.delete.mockImplementation(async () => {
        callOrder.push('delete');
      });

      await service.removeCategorie('cat-1', 'cat-2');

      expect(quizMock.updateMany).toHaveBeenCalledWith({
        where: { categorieId: 'cat-1' },
        data: { categorieId: 'cat-2' },
      });
      expect(categorieQuizMock.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
      expect(callOrder).toEqual(['updateMany', 'delete']);
    });

    it('sans reassignTo : supprime directement, sans transaction (comportement existant)', async () => {
      categorieQuizMock.findUnique.mockResolvedValue({
        id: 'cat-1',
        nom: 'Cat 1',
        _count: { quizzes: 0 },
      });

      await service.removeCategorie('cat-1');

      expect(categorieQuizMock.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });
});
