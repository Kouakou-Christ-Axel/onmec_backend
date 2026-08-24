import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  validateSync,
} from 'class-validator';

// Format accepte par `ms` : "15m", "7d", "3600s", ou un nombre de secondes.
const DURATION = /^(\d+\s*(ms|s|m|h|d|w|y)?)$/i;

/**
 * Validation des variables d'environnement au demarrage.
 *
 * Sans elle, une variable manquante ne se voyait qu'a l'execution — et pour
 * certaines, jamais : `TOKEN_EXPIRATION` absente produisait silencieusement
 * des JWT sans date d'expiration.
 */
export class EnvironmentVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsNotEmpty({ message: 'DATABASE_URL est obligatoire' })
  @IsString()
  DATABASE_URL: string;

  @IsNotEmpty({ message: 'TOKEN_SECRET est obligatoire' })
  @MinLength(32, {
    message: 'TOKEN_SECRET doit faire au moins 32 caractères',
  })
  TOKEN_SECRET: string;

  @IsNotEmpty({ message: 'REFRESH_TOKEN_SECRET est obligatoire' })
  @MinLength(32, {
    message: 'REFRESH_TOKEN_SECRET doit faire au moins 32 caractères',
  })
  REFRESH_TOKEN_SECRET: string;

  @IsNotEmpty({ message: 'TOKEN_EXPIRATION est obligatoire' })
  @Matches(DURATION, {
    message: 'TOKEN_EXPIRATION doit être une durée valide, par exemple "15m"',
  })
  TOKEN_EXPIRATION: string;

  @IsNotEmpty({ message: 'REFRESH_TOKEN_EXPIRATION est obligatoire' })
  @Matches(DURATION, {
    message:
      'REFRESH_TOKEN_EXPIRATION doit être une durée valide, par exemple "7d"',
  })
  REFRESH_TOKEN_EXPIRATION: string;

  @IsOptional()
  @IsIn(['production', 'staging', 'development', 'dev', 'test'])
  APP_ENV?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('\n  - ');
    throw new Error(
      `Configuration d'environnement invalide :\n  - ${details}\n` +
        'Voir .env.example pour la liste des variables attendues.',
    );
  }

  return config;
}
