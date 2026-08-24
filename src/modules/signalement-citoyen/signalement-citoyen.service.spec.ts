import { Test, TestingModule } from '@nestjs/testing';
import { SignalementCitoyenService } from './signalement-citoyen.service';
import { PrismaService } from '../../database/services/prisma.service';
import { EngagementService } from '../engagement/engagement.service';
import { GamificationService } from '../gamification/gamification.service';

describe('SignalementCitoyenService', () => {
  let service: SignalementCitoyenService;

  const prismaMock = {
    signalementCitoyen: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const engagementMock = {
    getEngagementStats: jest.fn().mockResolvedValue(new Map()),
  };

  // Le service credite des points au depot et a la validation d'un
  // signalement ; sans ce provider le module de test ne compile plus.
  const gamificationMock = {
    attribuerSansEchouer: jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalementCitoyenService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EngagementService, useValue: engagementMock },
        { provide: GamificationService, useValue: gamificationMock },
      ],
    }).compile();

    service = module.get<SignalementCitoyenService>(SignalementCitoyenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll - recherche par mot-clé (search)', () => {
    it('construit un filtre OR insensible à la casse sur titre, description, adresse et nom de catégorie', async () => {
      await service.findAll({ search: 'Route Abidjan' } as any);

      const whereArg =
        prismaMock.signalementCitoyen.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toEqual([
        { titre: { contains: 'Route Abidjan', mode: 'insensitive' } },
        { description: { contains: 'Route Abidjan', mode: 'insensitive' } },
        { adresse: { contains: 'Route Abidjan', mode: 'insensitive' } },
        {
          categorie: {
            is: { nom: { contains: 'Route Abidjan', mode: 'insensitive' } },
          },
        },
      ]);
    });

    it("n'applique aucun filtre OR lorsque search est absent (rétro-compatibilité)", async () => {
      await service.findAll({} as any);

      const whereArg =
        prismaMock.signalementCitoyen.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toBeUndefined();
    });

    it("n'applique aucun filtre OR lorsque search est vide ou ne contient que des espaces", async () => {
      await service.findAll({ search: '   ' } as any);

      const whereArg =
        prismaMock.signalementCitoyen.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toBeUndefined();
    });

    it('combine search avec les autres filtres existants (statut, pagination)', async () => {
      await service.findAll({
        search: 'poteau',
        statut: 'NOUVEAU',
        page: 2,
        limit: 5,
      } as any);

      const callArg = prismaMock.signalementCitoyen.findMany.mock.calls[0][0];
      expect(callArg.where.statut).toBe('NOUVEAU');
      expect(callArg.where.OR).toBeDefined();
      expect(callArg.skip).toBe(5);
      expect(callArg.take).toBe(5);
    });
  });
});
