import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Base jetable utilisee par `migrate dev` et `migrate diff --from-migrations`
// pour rejouer l'historique des migrations et detecter les derives.
// Optionnelle a dessein : `prisma generate` doit rester utilisable sans base
// (la CI le lance avec une DATABASE_URL factice), or `env()` echoue si la
// variable est absente. On lit donc process.env et on omet la cle si vide.
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
