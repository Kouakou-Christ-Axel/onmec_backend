import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DeviceService } from './device.service';
import { PrismaService } from '../../../database/services/prisma.service';

describe('DeviceService', () => {
  let service: DeviceService;

  // Sans ce provider, le module de test ne compilait pas et toute la suite
  // echouait.
  const prismaMock = {
    deviceToken: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<DeviceService>(DeviceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerDevice', () => {
    it("rattache l'appareil au compte fourni et ignore le userId du corps", async () => {
      prismaMock.deviceToken.upsert.mockResolvedValue({ token: 't' });

      await service.registerDevice(
        { token: 't', platform: 'android', userId: 'usurpe' },
        'membre-authentifie',
      );

      const arg = prismaMock.deviceToken.upsert.mock.calls[0][0];
      expect(arg.create.userId).toBe('membre-authentifie');
      expect(arg.update.userId).toBe('membre-authentifie');
    });

    it('accepte un appel anonyme en laissant l’appareil non rattaché', async () => {
      prismaMock.deviceToken.upsert.mockResolvedValue({ token: 't' });

      await service.registerDevice({ token: 't', platform: 'ios' }, null);

      expect(prismaMock.deviceToken.upsert.mock.calls[0][0].create.userId).toBeNull();
    });
  });

  describe('deleteDevice', () => {
    it("refuse de retirer l'appareil d'un autre compte", async () => {
      prismaMock.deviceToken.findUnique.mockResolvedValue({
        token: 't',
        userId: 'quelqu-un-d-autre',
      });

      await expect(service.deleteDevice({ token: 't' }, 'moi')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.deviceToken.delete).not.toHaveBeenCalled();
    });

    it('autorise le retrait de son propre appareil', async () => {
      prismaMock.deviceToken.findUnique.mockResolvedValue({
        token: 't',
        userId: 'moi',
      });
      prismaMock.deviceToken.delete.mockResolvedValue({ token: 't' });

      await service.deleteDevice({ token: 't' }, 'moi');

      expect(prismaMock.deviceToken.delete).toHaveBeenCalled();
    });

    it("autorise le retrait d'un appareil non rattaché", async () => {
      prismaMock.deviceToken.findUnique.mockResolvedValue({
        token: 't',
        userId: null,
      });
      prismaMock.deviceToken.delete.mockResolvedValue({ token: 't' });

      await service.deleteDevice({ token: 't' }, null);

      expect(prismaMock.deviceToken.delete).toHaveBeenCalled();
    });

    it('renvoie 404 sur un appareil inconnu', async () => {
      prismaMock.deviceToken.findUnique.mockResolvedValue(null);

      await expect(service.deleteDevice({ token: 't' }, 'moi')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
