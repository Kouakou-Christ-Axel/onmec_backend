import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ActualitesService } from './actualites.service';
import { PrismaService } from '../../database/services/prisma.service';
import { EngagementService } from '../engagement/engagement.service';
import { NotificationService } from '../notification/notification.service';
import { AdminRole, StatutActualite } from '../../generated/prisma/client';
import {
  AuthenticatedActor,
  MEMBER_ROLE,
} from '../../common/types/authenticated-actor';

describe('ActualitesService', () => {
  let service: ActualitesService;

  const buildService = async (cdnUrl: string) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActualitesService,
        { provide: PrismaService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => cdnUrl } },
        // Sans ce provider, le module de test ne compilait pas et toute la
        // suite échouait.
        { provide: EngagementService, useValue: {} },
        // Le service diffuse une notification a la premiere publication.
        { provide: NotificationService, useValue: {} },
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
    service = await buildService('https://admin.mec-ci.org');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('construction des URLs CDN', () => {
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
