import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ActualitesService } from './actualites.service';
import { PrismaService } from '../../database/services/prisma.service';

describe('ActualitesService', () => {
  let service: ActualitesService;

  const buildService = async (cdnUrl: string) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActualitesService,
        { provide: PrismaService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => cdnUrl } },
      ],
    }).compile();

    return module.get<ActualitesService>(ActualitesService);
  };

  // Accès à la méthode privée mapToEntity via cast pour tester la construction d'URL
  const mapImageUrl = (svc: ActualitesService, imageUrl: string | null) =>
    (svc as any).mapToEntity({ imageUrl }).imageUrl;

  beforeEach(async () => {
    service = await buildService('https://admin.mec-ci.org');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it("préfixe l'imageUrl avec le CDN_URL", () => {
    expect(mapImageUrl(service, '/uploads/actualites/img.png')).toBe(
      'https://admin.mec-ci.org/uploads/actualites/img.png',
    );
  });

  it('évite le double slash quand CDN_URL se termine par "/"', async () => {
    const svc = await buildService('https://admin.mec-ci.org/');
    expect(mapImageUrl(svc, '/uploads/actualites/img.png')).toBe(
      'https://admin.mec-ci.org/uploads/actualites/img.png',
    );
  });

  it('ajoute un slash manquant entre le CDN_URL et le chemin', async () => {
    const svc = await buildService('https://admin.mec-ci.org');
    expect(mapImageUrl(svc, 'uploads/actualites/img.png')).toBe(
      'https://admin.mec-ci.org/uploads/actualites/img.png',
    );
  });

  it("laisse imageUrl à null quand il n'y a pas d'image", () => {
    expect(mapImageUrl(service, null)).toBeNull();
  });
});
