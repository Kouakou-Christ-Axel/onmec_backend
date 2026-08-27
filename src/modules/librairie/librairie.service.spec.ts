import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LibrairieService } from './librairie.service';
import { PrismaService } from '../../database/services/prisma.service';
import { R2StorageService } from '../../common/services/r2-storage.service';

describe('LibrairieService', () => {
  let service: LibrairieService;

  // Squelette du CLI Nest jamais adapte : le service etait fourni sans ses
  // dependances, donc la suite echouait a la compilation du module de test.
  const prismaMock = {
    document: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const r2Mock = {
    getUploadUrl: jest.fn().mockResolvedValue('https://r2.example/put-url'),
    getPublicUrl: jest.fn((key: string) => `https://cdn.example/${key}`),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibrairieService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: { get: () => '' } },
        { provide: R2StorageService, useValue: r2Mock },
      ],
    }).compile();

    service = module.get<LibrairieService>(LibrairieService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Accès à la méthode privée via cast, pour tester la logique de découpage
  // de clé indépendamment du reste du service.
  const parseLibrairieKey = (key: string, baseName: 'fichier' | 'cover') =>
    (service as any).parseLibrairieKey(key, baseName);

  describe('parseLibrairieKey', () => {
    it("extrait l'id de dossier d'une clé fichier valide", () => {
      expect(
        parseLibrairieKey('librairie/abc-123/fichier.pdf', 'fichier'),
      ).toBe('abc-123');
    });

    it("extrait l'id de dossier d'une clé cover valide", () => {
      expect(
        parseLibrairieKey('librairie/abc-123/cover.jpg', 'cover'),
      ).toBe('abc-123');
    });

    it('rejette une clé hors du préfixe librairie/', () => {
      expect(() =>
        parseLibrairieKey('actualites/abc-123/fichier.pdf', 'fichier'),
      ).toThrow(BadRequestException);
    });

    it('rejette une clé cover fournie comme fichierKey', () => {
      expect(() =>
        parseLibrairieKey('librairie/abc-123/cover.jpg', 'fichier'),
      ).toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    it('refuse une coverKey appartenant à un autre document que fichierKey', async () => {
      await expect(
        service.create({
          title: 'Titre',
          fichierKey: 'librairie/doc-1/fichier.pdf',
          coverKey: 'librairie/doc-2/cover.jpg',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
