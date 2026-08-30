/**
 * Génère docs/openapi.json à partir des décorateurs Swagger de l'app,
 * pour le partager avec le front sans exposer un serveur.
 *
 * Usage : pnpm run docs:openapi
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';
import { buildSwaggerConfig } from '../src/swagger.config';

async function run() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());

  const outDir = join(__dirname, '..', 'docs');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'openapi.json'), JSON.stringify(document, null, 2));

  await app.close();
  console.log('docs/openapi.json généré.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
