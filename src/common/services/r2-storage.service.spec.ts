import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { R2StorageService } from './r2-storage.service';

describe('R2StorageService', () => {
  const fullEnv: Record<string, string> = {
    R2_ACCOUNT_ID: 'acc123',
    R2_ACCESS_KEY_ID: 'key123',
    R2_SECRET_ACCESS_KEY: 'secret123',
    R2_BUCKET_NAME: 'bucket123',
    R2_PUBLIC_URL: 'https://cdn.mec-ci.org',
  };

  const buildService = async (env: Record<string, string>) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        R2StorageService,
        { provide: ConfigService, useValue: { get: (key: string) => env[key] } },
      ],
    }).compile();

    return module.get<R2StorageService>(R2StorageService);
  };

  it('isConfigured() renvoie true quand R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME sont tous présents', async () => {
    const service = await buildService(fullEnv);
    expect(service.isConfigured()).toBe(true);
  });

  it('isConfigured() renvoie false quand une variable requise manque', async () => {
    const service = await buildService({ ...fullEnv, R2_SECRET_ACCESS_KEY: '' });
    expect(service.isConfigured()).toBe(false);
  });

  it("isConfigured() renvoie false sans aucune configuration", async () => {
    const service = await buildService({});
    expect(service.isConfigured()).toBe(false);
  });

  it('getUploadUrl() lève ServiceUnavailableException si non configuré', async () => {
    const service = await buildService({});
    await expect(
      service.getUploadUrl('actualites/img.png', 'image/png'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('delete() lève ServiceUnavailableException si non configuré', async () => {
    const service = await buildService({});
    await expect(service.delete('actualites/img.png')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("getPublicUrl() construit l'URL publique à partir de la clé", async () => {
    const service = await buildService(fullEnv);
    expect(service.getPublicUrl('actualites/img.png')).toBe(
      'https://cdn.mec-ci.org/actualites/img.png',
    );
  });

  it('getPublicUrl() évite le double slash quand R2_PUBLIC_URL se termine par "/"', async () => {
    const service = await buildService({
      ...fullEnv,
      R2_PUBLIC_URL: 'https://cdn.mec-ci.org/',
    });
    expect(service.getPublicUrl('actualites/img.png')).toBe(
      'https://cdn.mec-ci.org/actualites/img.png',
    );
  });

  it('getPublicUrl() évite le double slash quand la clé commence par "/"', async () => {
    const service = await buildService(fullEnv);
    expect(service.getPublicUrl('/actualites/img.png')).toBe(
      'https://cdn.mec-ci.org/actualites/img.png',
    );
  });
});
