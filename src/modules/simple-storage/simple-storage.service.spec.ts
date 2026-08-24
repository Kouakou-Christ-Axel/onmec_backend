import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { SimpleStorageService } from './simple-storage.service';

describe('SimpleStorageService', () => {
  let service: SimpleStorageService;

  // Le constructeur lit quatre variables AWS via getOrThrow : sans ce double,
  // l'instanciation echoue des que l'environnement de test ne les porte pas.
  const configMock = {
    getOrThrow: jest.fn((cle: string) => `valeur-de-test-${cle}`),
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
  });
});
