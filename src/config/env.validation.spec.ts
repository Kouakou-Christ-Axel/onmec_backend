// `plainToInstance` lit les metadonnees des decorateurs : sans ce polyfill,
// la validation echoue ici alors qu'elle fonctionne dans l'application (Nest
// le charge lui-meme au demarrage).
import 'reflect-metadata';
import { validateEnv } from './env.validation';

/**
 * Ces trois cas encadrent le compromis retenu : demarrer sans configuration en
 * developpement, refuser de demarrer sans secret en production. Les deux sont
 * faciles a casser par inadvertance en retouchant la validation.
 */
describe('validateEnv', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => warn.mockRestore());

  it('hors production, complete une configuration reduite a DATABASE_URL', () => {
    const config = validateEnv({ DATABASE_URL: 'postgres://x' }) as Record<
      string,
      string
    >;

    expect(config.TOKEN_EXPIRATION).toBe('15m');
    expect(config.REFRESH_TOKEN_EXPIRATION).toBe('7d');
    expect(config.TOKEN_SECRET).toBeTruthy();
    // Un secret unique ferait passer un refresh token pour un token d'acces.
    expect(config.TOKEN_SECRET).not.toBe(config.REFRESH_TOKEN_SECRET);
  });

  it('en production, refuse de demarrer sans secrets', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'postgres://x', NODE_ENV: 'production' }),
    ).toThrow(/TOKEN_SECRET/);
  });

  it('rejette une duree explicite mal formee', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgres://x',
        TOKEN_EXPIRATION: 'quinze minutes',
      }),
    ).toThrow(/TOKEN_EXPIRATION/);
  });
});
