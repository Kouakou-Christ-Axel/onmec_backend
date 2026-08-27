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

  // Document.uploadedById est nullable : un document dont l'administrateur a
  // ete supprime faisait tomber en 500 tout GET /librairie qui le contenait.
  describe('documentToDto face à un uploader supprimé', () => {
    const documentToDto = (document: unknown) =>
      (service as any).documentToDto(document);

    const documentSansUploader = {
      id: 'doc-1',
      title: 'Rapport annuel',
      description: null,
      categorie: null,
      coverImage: null,
      fileType: '.pdf',
      pageCount: 42,
      uploadedAt: new Date('2026-01-24T10:30:00Z'),
      uploadedBy: null,
    };

    it('renvoie uploadedBy à null au lieu de lever', () => {
      expect(documentToDto(documentSansUploader).uploadedBy).toBeNull();
    });

    it('laisse les autres champs intacts', () => {
      const dto = documentToDto(documentSansUploader);
      expect(dto.id).toBe('doc-1');
      expect(dto.title).toBe('Rapport annuel');
      expect(dto.pageCount).toBe(42);
    });

    it('expose l’uploader quand il existe encore', () => {
      const dto = documentToDto({
        ...documentSansUploader,
        uploadedBy: { id: 'a-1', fullname: 'Awa Koné', email: 'awa@mec-ci.org' },
      });
      expect(dto.uploadedBy).toEqual({
        id: 'a-1',
        fullname: 'Awa Koné',
        email: 'awa@mec-ci.org',
      });
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
