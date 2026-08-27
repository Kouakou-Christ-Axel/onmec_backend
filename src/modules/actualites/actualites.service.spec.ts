import { Test, TestingModule } from '@nestjs/testing';
import { ActualitesService } from './actualites.service';
import { PrismaService } from '../../database/services/prisma.service';
import { EngagementService } from '../engagement/engagement.service';
import { NotificationService } from '../notification/notification.service';
import { R2StorageService } from '../../common/services/r2-storage.service';
import { AdminRole, StatutActualite } from '../../generated/prisma/client';
import {
  AuthenticatedActor,
  MEMBER_ROLE,
} from '../../common/types/authenticated-actor';

describe('ActualitesService', () => {
  let service: ActualitesService;

  const buildService = async (publicUrl: string) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActualitesService,
        { provide: PrismaService, useValue: {} },
        // Sans ce provider, le module de test ne compilait pas et toute la
        // suite échouait.
        { provide: EngagementService, useValue: {} },
        // Le service diffuse une notification a la premiere publication.
        { provide: NotificationService, useValue: {} },
        {
          provide: R2StorageService,
          useValue: {
            getPublicUrl: (key: string) =>
              `${publicUrl.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`,
          },
        },
      ],
    }).compile();

    return module.get<ActualitesService>(ActualitesService);
  };

  // Accès aux méthodes privées via cast, pour tester la logique pure.
  const mapImageUrl = (svc: ActualitesService, imageUrl: string | null) =>
    (svc as any).mapToEntity({ imageUrl }).imageUrl;

  const visibility = (svc: ActualitesService, actor?: AuthenticatedActor) =>
    (svc as any).visibilityFilter(actor);

  const actor = (
    type: 'admin' | 'member',
    role: string,
  ): AuthenticatedActor =>
    ({
      id: 'x',
      type,
      role,
      email: 'x@y.z',
      fullname: 'X',
      phone: null,
      avatar: null,
    }) as AuthenticatedActor;

  beforeEach(async () => {
    service = await buildService('https://cdn.mec-ci.org');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe("construction de l'URL publique R2", () => {
    it("préfixe l'imageUrl (clé objet) avec R2_PUBLIC_URL", () => {
      expect(mapImageUrl(service, 'actualites/img.png')).toBe(
        'https://cdn.mec-ci.org/actualites/img.png',
      );
    });

    it('évite le double slash quand R2_PUBLIC_URL se termine par "/"', async () => {
      const svc = await buildService('https://cdn.mec-ci.org/');
      expect(mapImageUrl(svc, 'actualites/img.png')).toBe(
        'https://cdn.mec-ci.org/actualites/img.png',
      );
    });

    it("laisse imageUrl à null quand il n'y a pas d'image", () => {
      expect(mapImageUrl(service, null)).toBeNull();
    });
  });

  describe("génération de l'URL présignée pour une image de contenu", () => {
    it('génère une clé sous actualites/contenu/ et retourne uploadUrl + expiresIn', async () => {
      const svc = await buildService('https://cdn.mec-ci.org');
      const r2 = (svc as any).r2Service as {
        getUploadUrl: jest.Mock;
      };
      r2.getUploadUrl = jest
        .fn()
        .mockResolvedValue('https://r2.example/put-url');

      const result = await svc.buildContentImageUrl('photo.png', 'image/png');

      expect(result.key).toMatch(/^actualites\/contenu\/.+\.png$/);
      expect(result.uploadUrl).toBe('https://r2.example/put-url');
      expect(result.expiresIn).toBe(300);
      expect(r2.getUploadUrl).toHaveBeenCalledWith(
        result.key,
        'image/png',
        300,
      );
    });

    it('rejette une extension non autorisée', async () => {
      const svc = await buildService('https://cdn.mec-ci.org');
      await expect(
        svc.buildContentImageUrl('malware.exe', 'application/octet-stream'),
      ).rejects.toThrow('Seuls les fichiers image sont acceptés');
    });
  });

  describe("génération de l'URL présignée pour une image de couverture", () => {
    it('génère une clé sous actualites/ (pas actualites/contenu/)', async () => {
      const svc = await buildService('https://cdn.mec-ci.org');
      const r2 = (svc as any).r2Service as { getUploadUrl: jest.Mock };
      r2.getUploadUrl = jest
        .fn()
        .mockResolvedValue('https://r2.example/put-url');

      const result = await svc.buildCoverImageUrl('photo.png', 'image/png');

      expect(result.key).toMatch(/^actualites\/[^/]+\.png$/);
      expect(result.uploadUrl).toBe('https://r2.example/put-url');
      expect(result.expiresIn).toBe(300);
    });
  });

  describe('validation de imageKey sur create/update', () => {
    const assertCoverImageKey = (svc: ActualitesService, key?: string) =>
      (svc as any).assertCoverImageKey(key);

    it("accepte une clé sous actualites/ hors contenu", () => {
      expect(() =>
        assertCoverImageKey(service, 'actualites/photo.png'),
      ).not.toThrow();
    });

    it('accepte l’absence de clé', () => {
      expect(() => assertCoverImageKey(service, undefined)).not.toThrow();
    });

    it('rejette une clé de contenu réutilisée comme couverture', () => {
      expect(() =>
        assertCoverImageKey(service, 'actualites/contenu/photo.png'),
      ).toThrow('imageKey doit être une clé de couverture');
    });

    it('rejette une clé hors du préfixe actualites/', () => {
      expect(() =>
        assertCoverImageKey(service, 'librairie/photo.png'),
      ).toThrow('imageKey doit être une clé de couverture');
    });
  });

  describe('filtre de visibilité', () => {
    it('restreint un visiteur anonyme aux actualités publiées', () => {
      expect(visibility(service, undefined)).toEqual({
        deletedAt: null,
        statut: StatutActualite.PUBLIEE,
      });
    });

    it('restreint un membre aux actualités publiées', () => {
      expect(visibility(service, actor('member', MEMBER_ROLE))).toEqual({
        deletedAt: null,
        statut: StatutActualite.PUBLIEE,
      });
    });

    it('restreint le modérateur aux actualités publiées', () => {
      expect(visibility(service, actor('admin', AdminRole.MODERATEUR))).toEqual({
        deletedAt: null,
        statut: StatutActualite.PUBLIEE,
      });
    });

    it('laisse les rôles éditoriaux voir les brouillons', () => {
      for (const role of [
        AdminRole.ADMIN_NATIONAL,
        AdminRole.CHARGE_COMMUNICATION,
      ]) {
        expect(visibility(service, actor('admin', role))).toEqual({
          deletedAt: null,
        });
      }
    });

    it('exclut toujours les actualités supprimées', () => {
      const filters = [
        visibility(service, undefined),
        visibility(service, actor('admin', AdminRole.ADMIN_NATIONAL)),
      ];
      for (const f of filters) {
        expect(f.deletedAt).toBeNull();
      }
    });
  });
});
