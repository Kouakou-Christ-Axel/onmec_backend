import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { SimpleStorageService } from './simple-storage.service';

describe('SimpleStorageService', () => {
  let service: SimpleStorageService;

  // Le constructeur lit quatre variables AWS via get(). Le double les fournit
  // toutes : on teste ici le chemin « S3 configure ».
  const configMock = {
    get: jest.fn((cle: string) => `valeur-de-test-${cle}`),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimpleStorageService,
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<SimpleStorageService>(SimpleStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.s3Client).not.toBeNull();
  });

  it('sans configuration AWS, s instancie quand meme et refuse a l usage', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimpleStorageService,
        { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
      ],
    }).compile();

    const inactif = module.get<SimpleStorageService>(SimpleStorageService);

    // Le point du correctif : l'instanciation reussit — sinon l'application
    // entiere refusait de demarrer sans variables AWS.
    expect(inactif).toBeDefined();
    expect(inactif.s3Client).toBeNull();
    await expect(inactif.deleteFile('bucket', 'cle')).rejects.toThrow(
      /S3 non configure/,
    );
  });
});
