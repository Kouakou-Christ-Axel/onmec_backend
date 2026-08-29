/**
 * Crée (ou réinitialise le mot de passe d') un compte back-office directement
 * sur le serveur, sans dépendre du seed automatique du pipeline de déploiement.
 *
 * Utile en secours : si `prisma db seed` échoue en production faute de
 * `SEED_ADMIN_PASSWORD` (aucun admin en base + secret absent), ce script
 * permet d'amorcer le premier compte à la main, une seule fois.
 *
 * Usage (sur le VPS, dans le dossier de l'app) :
 *   pnpm run create-admin
 *   ADMIN_EMAIL=moi@mec-ci.org ADMIN_FULLNAME="Mon Nom" ADMIN_ROLE=ADMIN_NATIONAL pnpm run create-admin
 *   ADMIN_RESET_PASSWORD=1 pnpm run create-admin   # regenere le mot de passe d'un compte existant
 *
 * Toutes les variables sont optionnelles : sans elles, un compte
 * ADMIN_NATIONAL par defaut est cree avec un mot de passe genere
 * aleatoirement et affiche une seule fois dans la console.
 */
import 'dotenv/config';
import { PrismaClient, AdminRole } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import { HashService } from '../src/common/services/hash.service';
import { GenerateDataService } from '../src/common/services/generate-data.service';

const DEFAULT_EMAIL = 'admin@mec-ci.org';
const DEFAULT_FULLNAME = 'Administrateur';
const DEFAULT_ROLE: AdminRole = 'ADMIN_NATIONAL';

async function main() {
  const email = process.env.ADMIN_EMAIL || DEFAULT_EMAIL;
  const fullname = process.env.ADMIN_FULLNAME || DEFAULT_FULLNAME;
  const role = (process.env.ADMIN_ROLE as AdminRole) || DEFAULT_ROLE;
  const resetPassword = process.env.ADMIN_RESET_PASSWORD === '1';

  if (!Object.values(AdminRole).includes(role)) {
    console.error(
      `❌ ADMIN_ROLE invalide : "${role}". Valeurs acceptées : ${Object.values(AdminRole).join(', ')}`,
    );
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const hashService = new HashService(new ConfigService());
  const generateDataService = new GenerateDataService();

  const password = process.env.ADMIN_PASSWORD || generateDataService.generateSecurePassword();
  const hash = await hashService.hash(password);

  const existing = await prisma.admin.findUnique({ where: { email } });

  if (existing && !resetPassword) {
    console.log(
      `ℹ️  Un compte existe déjà pour ${email} (id ${existing.id}). ` +
        'Rien à faire. Relancer avec ADMIN_RESET_PASSWORD=1 pour lui attribuer un nouveau mot de passe.',
    );
    await prisma.$disconnect();
    return;
  }

  const admin = existing
    ? await prisma.admin.update({
        where: { email },
        data: { password: hash, mustChangePassword: true, isActive: true },
      })
    : await prisma.admin.create({
        data: { fullname, email, role, password: hash, mustChangePassword: true, isActive: true },
      });

  console.log(existing ? '✅ Mot de passe réinitialisé.' : '✅ Compte admin créé.');
  console.log(`   id       : ${admin.id}`);
  console.log(`   email    : ${admin.email}`);
  console.log(`   role     : ${admin.role}`);
  console.log(`   password : ${password}`);
  console.log(
    '\n⚠️  Ce mot de passe ne sera plus jamais affiché — le noter maintenant. ' +
      '`mustChangePassword` est activé : il devra être changé à la première connexion.',
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
