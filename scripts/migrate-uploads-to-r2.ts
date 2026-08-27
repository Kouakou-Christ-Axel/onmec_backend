/**
 * Migre les fichiers déjà présents dans ./uploads vers Cloudflare R2, puis
 * met à jour en base les colonnes qui référencent encore un chemin
 * `/uploads/...`.
 *
 * Usage : pnpm run migrate:uploads-to-r2
 *
 * Idempotent : un fichier déjà migré est simplement réécrit (même contenu)
 * ; une ligne déjà migrée en base (valeur ne commençant plus par
 * `/uploads/`) n'est plus sélectionnée lors d'un nouveau passage. Aucun
 * fichier local ni ligne en base n'est jamais effacé, y compris en cas
 * d'échec partiel — relancer le script reprend là où il s'est arrêté.
 */
import 'dotenv/config';
import axios from 'axios';
import { promises as fs } from 'fs';
import { join, relative, extname } from 'path';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import { R2StorageService } from '../src/common/services/r2-storage.service';

const UPLOADS_DIR = join(__dirname, '..', 'uploads');
const TMP_DIR = join(UPLOADS_DIR, 'tmp');

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.pdf': 'application/pdf',
};

const OLD_PATH_PREFIX = /^\/?uploads\//;

async function listUploadedFiles(): Promise<string[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(UPLOADS_DIR, { recursive: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    const abs = join(UPLOADS_DIR, entry);
    if (abs.startsWith(TMP_DIR)) continue;
    const stat = await fs.stat(abs).catch(() => null);
    if (stat?.isFile()) files.push(abs);
  }
  return files;
}

async function uploadFile(
  r2: R2StorageService,
  absPath: string,
): Promise<string> {
  const key = relative(UPLOADS_DIR, absPath).split('\\').join('/');
  const contentType =
    CONTENT_TYPES[extname(absPath).toLowerCase()] ?? 'application/octet-stream';
  const uploadUrl = await r2.getUploadUrl(key, contentType, 600);
  const body = await fs.readFile(absPath);
  await axios.put(uploadUrl, body, {
    headers: { 'Content-Type': contentType },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  return key;
}

/** Remplace, pour un modèle/colonne donnés, chaque valeur `/uploads/<clé migrée>` par `<clé>`. */
async function updateColumn(
  label: string,
  findMany: () => Promise<{ id: string; value: string | null }[]>,
  update: (id: string, key: string) => Promise<unknown>,
  migratedKeys: Set<string>,
): Promise<number> {
  const rows = await findMany();
  let updated = 0;
  let unrecognized = 0;
  for (const row of rows) {
    if (!row.value || !OLD_PATH_PREFIX.test(row.value)) continue;
    const key = row.value.replace(OLD_PATH_PREFIX, '');
    if (!migratedKeys.has(key)) {
      // Valeur au format /uploads/... mais dont le fichier correspondant n'a
      // pas été (re)migré avec succès dans ce passage — signalé plutôt que
      // silencieusement ignoré, pour ne pas confondre avec "rien à faire".
      unrecognized++;
      continue;
    }
    await update(row.id, key);
    updated++;
  }
  const suffix = unrecognized > 0 ? `, ${unrecognized} ignorée(s) (fichier non migré)` : '';
  console.log(`   ${label} : ${updated} ligne(s) mise(s) à jour${suffix}`);
  return updated;
}

async function main() {
  const configService = new ConfigService();
  const r2 = new R2StorageService(configService);
  if (!r2.isConfigured()) {
    console.error(
      '❌ R2 non configuré (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME manquants). Abandon.',
    );
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const files = await listUploadedFiles();
  console.log(`🔍 ${files.length} fichier(s) trouvé(s) sous ./uploads (hors tmp/).`);

  const migratedKeys = new Set<string>();
  const failed: { file: string; error: string }[] = [];

  for (const absPath of files) {
    try {
      const key = await uploadFile(r2, absPath);
      migratedKeys.add(key);
      console.log(`   ✅ ${key}`);
    } catch (error) {
      failed.push({ file: absPath, error: (error as Error).message });
      console.error(`   ❌ ${absPath} : ${(error as Error).message}`);
    }
  }

  console.log(
    `\n📦 Upload R2 : ${migratedKeys.size} réussi(s), ${failed.length} échoué(s).`,
  );

  console.log('\n🗄️  Mise à jour des colonnes en base...');
  let totalUpdated = 0;

  totalUpdated += await updateColumn(
    'Actualite.imageUrl',
    async () =>
      (
        await prisma.actualite.findMany({
          where: { imageUrl: { not: null } },
          select: { id: true, imageUrl: true },
        })
      ).map((r) => ({ id: r.id, value: r.imageUrl })),
    (id, key) => prisma.actualite.update({ where: { id }, data: { imageUrl: key } }),
    migratedKeys,
  );

  totalUpdated += await updateColumn(
    'Member.avatar',
    async () =>
      (
        await prisma.member.findMany({
          where: { avatar: { not: null } },
          select: { id: true, avatar: true },
        })
      ).map((r) => ({ id: r.id, value: r.avatar })),
    (id, key) => prisma.member.update({ where: { id }, data: { avatar: key } }),
    migratedKeys,
  );

  totalUpdated += await updateColumn(
    'Document.fileUrl',
    async () =>
      (await prisma.document.findMany({ select: { id: true, fileUrl: true } })).map(
        (r) => ({ id: r.id, value: r.fileUrl }),
      ),
    (id, key) => prisma.document.update({ where: { id }, data: { fileUrl: key } }),
    migratedKeys,
  );

  totalUpdated += await updateColumn(
    'Document.coverImage',
    async () =>
      (
        await prisma.document.findMany({
          where: { coverImage: { not: null } },
          select: { id: true, coverImage: true },
        })
      ).map((r) => ({ id: r.id, value: r.coverImage })),
    (id, key) => prisma.document.update({ where: { id }, data: { coverImage: key } }),
    migratedKeys,
  );

  totalUpdated += await updateColumn(
    'SignalementCitoyen.photo',
    async () =>
      (
        await prisma.signalementCitoyen.findMany({
          where: { photo: { not: null } },
          select: { id: true, photo: true },
        })
      ).map((r) => ({ id: r.id, value: r.photo })),
    (id, key) => prisma.signalementCitoyen.update({ where: { id }, data: { photo: key } }),
    migratedKeys,
  );

  console.log(`\n🎉 Terminé. ${totalUpdated} ligne(s) mise(s) à jour au total.`);
  if (failed.length > 0) {
    console.log(
      `⚠️  ${failed.length} fichier(s) n'ont pas pu être migrés (voir ci-dessus). ` +
        'Relancer le script pour réessayer — rien n\'a été supprimé localement ni en base.',
    );
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
