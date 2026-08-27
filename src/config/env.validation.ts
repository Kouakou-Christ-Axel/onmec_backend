import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  validateSync,
} from 'class-validator';

// Format accepte par `ms` : "15m", "7d", "3600s", ou un nombre de secondes.
const DURATION = /^(\d+\s*(ms|s|m|h|d|w|y)?)$/i;

/**
 * Valeurs par defaut appliquees quand la variable est absente ou vide.
 *
 * Ce sont des reglages, pas des secrets : les publier dans le depot ne coute
 * rien et evite qu'un `.env` incomplet empeche l'application de demarrer.
 */
const DEFAUTS: Record<string, string> = {
  TOKEN_EXPIRATION: '15m',
  REFRESH_TOKEN_EXPIRATION: '7d',
  BCRYPT_ROUNDS: '12',
};

/**
 * Secrets de repli hors production.
 *
 * Volontairement reconnaissables, et **differents l'un de l'autre** : avec un
 * secret unique, un refresh token se verifierait comme un token d'acces et
 * inversement — la separation des deux cycles de vie disparaitrait.
 *
 * Fixes et non aleatoires : un secret regenere a chaque demarrage invaliderait
 * tous les tokens a chaque rechargement en mode `--watch`, ce qui rendrait les
 * scripts de verification ininterpretables.
 *
 * En production, aucun repli : l'application refuse de demarrer. Un secret
 * publie dans le depot permettrait a n'importe qui de forger un token admin.
 */
const SECRETS_DEV: Record<string, string> = {
  TOKEN_SECRET: 'dev-only-token-secret-onmec-ne-pas-utiliser-en-production',
  REFRESH_TOKEN_SECRET:
    'dev-only-refresh-secret-onmec-ne-pas-utiliser-en-production',
};

const LONGUEUR_SECRET_RECOMMANDEE = 32;

function estVide(valeur: unknown): boolean {
  return valeur === undefined || valeur === null || valeur === '';
}

/**
 * Complete la configuration avant validation.
 *
 * Le retour de `validateEnv` devient la configuration lue par `ConfigService`
 * et est reinjecte dans `process.env` par `ConfigModule` : les defauts poses
 * ici sont donc visibles partout, y compris par les `getOrThrow`.
 */
function appliquerDefauts(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const resultat = { ...config };
  const production = resultat.NODE_ENV === 'production';

  const appliques: string[] = [];
  for (const [cle, valeur] of Object.entries(DEFAUTS)) {
    if (estVide(resultat[cle])) {
      resultat[cle] = valeur;
      appliques.push(`${cle}=${valeur}`);
    }
  }
  if (appliques.length > 0) {
    console.warn(
      `ℹ️  Variables absentes, valeurs par défaut appliquées : ${appliques.join(', ')}`,
    );
  }

  if (!production) {
    const replies = Object.entries(SECRETS_DEV).filter(([cle]) =>
      estVide(resultat[cle]),
    );
    for (const [cle, valeur] of replies) {
      resultat[cle] = valeur;
    }
    if (replies.length > 0) {
      console.warn(
        `⚠️  ${replies.map(([cle]) => cle).join(' et ')} absent(s) : secret(s) de développement utilisé(s). ` +
          'Les tokens émis sont forgeables par quiconque lit ce dépôt — ne jamais exposer cette instance.',
      );
    }
  }

  // La longueur est une question d'hygiene, pas de fonctionnement : un secret
  // court signe et verifie correctement. On avertit, on ne bloque pas — refuser
  // de demarrer sur ce motif transformerait un deploiement qui tourne en panne.
  for (const cle of Object.keys(SECRETS_DEV)) {
    const valeur = resultat[cle];
    if (
      typeof valeur === 'string' &&
      valeur.length > 0 &&
      valeur.length < LONGUEUR_SECRET_RECOMMANDEE
    ) {
      console.warn(
        `⚠️  ${cle} fait ${valeur.length} caractères : au moins ${LONGUEUR_SECRET_RECOMMANDEE} sont recommandés.`,
      );
    }
  }

  return resultat;
}

/**
 * Validation des variables d'environnement au demarrage.
 *
 * Ne reste bloquant que ce qui n'a pas de defaut acceptable : l'URL de la base
 * et, en production uniquement, les deux secrets de signature. Les durees
 * d'expiration ont un defaut (voir `DEFAUTS`), mais restent validees — une
 * valeur explicite mal formee doit etre signalee, et `TOKEN_EXPIRATION` vide
 * produisait auparavant des JWT sans date d'expiration.
 */
export class EnvironmentVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsNotEmpty({ message: 'DATABASE_URL est obligatoire' })
  DATABASE_URL: string;

  @IsNotEmpty({
    message:
      'TOKEN_SECRET est obligatoire en production (un secret de développement est utilisé sinon)',
  })
  TOKEN_SECRET: string;

  @IsNotEmpty({
    message:
      'REFRESH_TOKEN_SECRET est obligatoire en production (un secret de développement est utilisé sinon)',
  })
  REFRESH_TOKEN_SECRET: string;

  @Matches(DURATION, {
    message: 'TOKEN_EXPIRATION doit être une durée valide, par exemple "15m"',
  })
  TOKEN_EXPIRATION: string;

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
  const complete = appliquerDefauts(config);

  const validated = plainToInstance(EnvironmentVariables, complete, {
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

  return complete;
}
