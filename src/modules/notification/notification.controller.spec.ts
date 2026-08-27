import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';
import { DeviceService } from './device/device.service';
import { AuthenticatedActor } from '../../common/types/authenticated-actor';

describe('NotificationController', () => {
  let controller: NotificationController;

  // Les trois services sont mockés : les fournir réellement obligerait à
  // instancier PrismaService et à initialiser Firebase, ce qui faisait échouer
  // la compilation du module de test.
  const deviceMock = {
    registerDevice: jest.fn().mockResolvedValue({}),
    deleteDevice: jest.fn().mockResolvedValue({}),
  };

  const acteur = (type: 'admin' | 'member'): AuthenticatedActor =>
    ({ id: 'acteur-1', type, role: 'MEMBER' }) as AuthenticatedActor;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: {} },
        { provide: PushService, useValue: {} },
        { provide: DeviceService, useValue: deviceMock },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('registerDevice', () => {
    it("rattache l'appareil au membre authentifié", () => {
      controller.registerDevice(
        { token: 't', platform: 'android' },
        acteur('member'),
      );
      expect(deviceMock.registerDevice).toHaveBeenCalledWith(
        expect.anything(),
        'acteur-1',
      );
    });

    it("n'attache rien pour un appel anonyme", () => {
      controller.registerDevice({ token: 't', platform: 'android' }, undefined);
      expect(deviceMock.registerDevice).toHaveBeenCalledWith(
        expect.anything(),
        null,
      );
    });

    it("n'attache rien pour un compte back-office", () => {
      // `DeviceToken.userId` référence la table des membres : y écrire un
      // identifiant d'admin violerait la clé étrangère.
      controller.registerDevice(
        { token: 't', platform: 'android' },
        acteur('admin'),
      );
      expect(deviceMock.registerDevice).toHaveBeenCalledWith(
        expect.anything(),
        null,
      );
    });
  });
});
