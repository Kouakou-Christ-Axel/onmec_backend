import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LibrairieService } from './librairie.service';
import { PrismaService } from '../../database/services/prisma.service';

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

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibrairieService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: { get: () => '' } },
      ],
    }).compile();

    service = module.get<LibrairieService>(LibrairieService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
