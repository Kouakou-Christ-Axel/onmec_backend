import { Test, TestingModule } from '@nestjs/testing';
import { SignalementCitoyenService } from './signalement-citoyen.service';
import { PrismaService } from '../../database/services/prisma.service';
import { EngagementService } from '../engagement/engagement.service';
import { GamificationService } from '../gamification/gamification.service';
import { NotificationService } from '../notification/notification.service';
import { R2StorageService } from '../../common/services/r2-storage.service';

describe('SignalementCitoyenService', () => {
  let service: SignalementCitoyenService;

  const prismaMock = {
    signalementCitoyen: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
    },
    signalementUpdate: {
      create: jest.fn(),
      findMany: jest.fn(),
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

  // Le service previent le citoyen au changement de statut de son signalement.
  const notificationMock = {
    notifierMembre: jest.fn().mockResolvedValue(undefined),
  };

  // Le service resout l'URL publique de la photo (getPublicUrl) et supprime
  // l'ancien objet R2 au remplacement ; sans ce provider le module de test ne
  // compile plus.
  const r2Mock = {
    isConfigured: jest.fn().mockReturnValue(true),
    getUploadUrl: jest.fn().mockResolvedValue('https://r2.example.com/signed'),
    delete: jest.fn().mockResolvedValue(undefined),
    getPublicUrl: jest.fn((key: string) => `https://cdn.mec-ci.org/${key}`),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalementCitoyenService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EngagementService, useValue: engagementMock },
        { provide: GamificationService, useValue: gamificationMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: R2StorageService, useValue: r2Mock },
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

  describe('addUpdate / getUpdates', () => {
    it('addUpdate lève NotFoundException si le signalement n’existe pas', async () => {
      prismaMock.signalementCitoyen.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.addUpdate('missing-id', 'admin-id', 'texte'),
      ).rejects.toThrow('Signalement citoyen avec l\'id missing-id introuvable');
    });

    it('addUpdate reshape la réponse avec auteur (admin présent)', async () => {
      prismaMock.signalementCitoyen.findUnique.mockResolvedValueOnce({ id: 'sig-1' });
      prismaMock.signalementUpdate.create.mockResolvedValueOnce({
        id: 'upd-1',
        signalementId: 'sig-1',
        texte: 'texte',
        createdAt: new Date('2026-01-01'),
        auteur: { id: 'admin-1', fullname: 'Jean Kouassi' },
      });

      const result = await service.addUpdate('sig-1', 'admin-1', 'texte');

      expect(result.auteur).toEqual({ id: 'admin-1', fullname: 'Jean Kouassi' });
    });

    it('getUpdates renvoie auteur: null quand l’admin auteur a été supprimé', async () => {
      prismaMock.signalementCitoyen.findUnique.mockResolvedValueOnce({ id: 'sig-1' });
      prismaMock.signalementUpdate.findMany.mockResolvedValueOnce([
        {
          id: 'upd-1',
          signalementId: 'sig-1',
          texte: 'texte',
          createdAt: new Date('2026-01-01'),
          auteur: null,
        },
      ]);

      const result = await service.getUpdates('sig-1');

      expect(result[0].auteur).toBeNull();
    });

    it('getUpdates lève NotFoundException si le signalement n’existe pas', async () => {
      prismaMock.signalementCitoyen.findUnique.mockResolvedValueOnce(null);

      await expect(service.getUpdates('missing-id')).rejects.toThrow(
        'Signalement citoyen avec l\'id missing-id introuvable',
      );
    });
  });
});
