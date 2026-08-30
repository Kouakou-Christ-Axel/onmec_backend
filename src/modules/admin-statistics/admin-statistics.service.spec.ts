import { Test, TestingModule } from '@nestjs/testing';
import { AdminStatisticsService } from './admin-statistics.service';
import { PrismaService } from '../../database/services/prisma.service';

describe('AdminStatisticsService', () => {
  let service: AdminStatisticsService;

  const signalementCitoyenMock = { groupBy: jest.fn() };
  const categorieSignalementMock = { findMany: jest.fn() };
  const memberMock = { groupBy: jest.fn() };
  const quizMock = { count: jest.fn() };
  const userQuizMock = { aggregate: jest.fn() };

  const prismaMock = {
    signalementCitoyen: signalementCitoyenMock,
    categorieSignalement: categorieSignalementMock,
    member: memberMock,
    quiz: quizMock,
    userQuiz: userQuizMock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminStatisticsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AdminStatisticsService>(AdminStatisticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('happy path : mappe groupBy vers parStatut/parCategorie/membres.* et calcule les totaux', async () => {
    signalementCitoyenMock.groupBy.mockImplementation(({ by }) => {
      if (by[0] === 'statut') {
        return Promise.resolve([
          { statut: 'NOUVEAU', _count: 12 },
          { statut: 'EN_COURS', _count: 5 },
          { statut: 'RESOLU', _count: 30 },
          { statut: 'REJETE', _count: 2 },
        ]);
      }
      return Promise.resolve([
        { categorieId: 'cat-1', _count: 18 },
        { categorieId: 'cat-2', _count: 31 },
      ]);
    });
    categorieSignalementMock.findMany.mockResolvedValue([
      { id: 'cat-1', nom: 'Voirie' },
      { id: 'cat-2', nom: 'Éclairage' },
    ]);
    memberMock.groupBy.mockResolvedValue([
      { statut: 'ACTIF', _count: 1150 },
      { statut: 'SUSPENDU', _count: 40 },
      { statut: 'BANNI', _count: 10 },
    ]);
    quizMock.count.mockResolvedValue(15);
    userQuizMock.aggregate.mockResolvedValue({ _count: 320, _avg: { score: 66.6 } });

    const result = await service.getStatistics();

    expect(result.signalements).toEqual({
      total: 49,
      parStatut: { NOUVEAU: 12, EN_COURS: 5, RESOLU: 30, REJETE: 2 },
      parCategorie: [
        { categorieId: 'cat-1', nom: 'Voirie', total: 18 },
        { categorieId: 'cat-2', nom: 'Éclairage', total: 31 },
      ],
    });
    expect(result.membres).toEqual({
      total: 1200,
      actifs: 1150,
      suspendus: 40,
      bannis: 10,
    });
    expect(result.quiz).toEqual({
      totalQuiz: 15,
      totalTentatives: 320,
      scoreMoyenGlobal: 67,
    });
  });

  it('statut absent du groupBy (ex. aucun REJETE) : apparaît à 0, pas absent', async () => {
    signalementCitoyenMock.groupBy.mockImplementation(({ by }) => {
      if (by[0] === 'statut') {
        return Promise.resolve([
          { statut: 'NOUVEAU', _count: 12 },
          { statut: 'EN_COURS', _count: 5 },
          { statut: 'RESOLU', _count: 30 },
        ]);
      }
      return Promise.resolve([]);
    });
    categorieSignalementMock.findMany.mockResolvedValue([]);
    memberMock.groupBy.mockResolvedValue([]);
    quizMock.count.mockResolvedValue(0);
    userQuizMock.aggregate.mockResolvedValue({ _count: 0, _avg: { score: null } });

    const result = await service.getStatistics();

    expect(result.signalements.parStatut).toEqual({
      NOUVEAU: 12,
      EN_COURS: 5,
      RESOLU: 30,
      REJETE: 0,
    });
    expect(result.signalements.parStatut).toHaveProperty('REJETE');
  });

  it('DB vide : toutes les valeurs à 0, scoreMoyenGlobal à 0 (pas NaN)', async () => {
    signalementCitoyenMock.groupBy.mockResolvedValue([]);
    categorieSignalementMock.findMany.mockResolvedValue([]);
    memberMock.groupBy.mockResolvedValue([]);
    quizMock.count.mockResolvedValue(0);
    userQuizMock.aggregate.mockResolvedValue({ _count: 0, _avg: { score: null } });

    const result = await service.getStatistics();

    expect(result.signalements).toEqual({
      total: 0,
      parStatut: { NOUVEAU: 0, EN_COURS: 0, RESOLU: 0, REJETE: 0 },
      parCategorie: [],
    });
    expect(result.membres).toEqual({ total: 0, actifs: 0, suspendus: 0, bannis: 0 });
    expect(result.quiz).toEqual({ totalQuiz: 0, totalTentatives: 0, scoreMoyenGlobal: 0 });
    expect(categorieSignalementMock.findMany).not.toHaveBeenCalled();
  });
});
