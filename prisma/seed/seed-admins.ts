import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../../src/generated/prisma/client';

// UUID fixes : le seed doit rester rejouable (la CI le lance a chaque deploiement).
export const ADMIN_ID = {
  national:      '10000000-0000-0000-0000-000000000001',
  communication: '10000000-0000-0000-0000-000000000002',
  moderation:    '10000000-0000-0000-0000-000000000003',
};

/**
 * Mot de passe initial des comptes back-office.
 *
 * Il n'y a volontairement pas de valeur par defaut en production : un compte
 * administrateur national avec un mot de passe connu et publie dans le depot
 * serait une porte ouverte. En developpement, on retombe sur une valeur
 * explicite et bruyante.
 */
function resolveSeedPassword(): string {
  const fromEnv = process.env.SEED_ADMIN_PASSWORD;
  if (fromEnv && fromEnv.length > 0) return fromEnv;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SEED_ADMIN_PASSWORD est obligatoire pour semer les comptes admin en production.',
    );
  }

  console.warn(
    '⚠️  SEED_ADMIN_PASSWORD absent : utilisation du mot de passe de developpement "ChangeMoi!2026".',
  );
  return 'ChangeMoi!2026';
}

export async function seedAdmins(prisma: PrismaClient) {
  const hash = await bcrypt.hash(resolveSeedPassword(), await bcrypt.genSalt());

  // `mustChangePassword: true` : le mot de passe issu du seed est partage,
  // il doit etre remplace a la premiere connexion.
  const base = { password: hash, mustChangePassword: true, isActive: true };

  const national = await prisma.admin.upsert({
    where: { id: ADMIN_ID.national },
    update: {},
    create: {
      ...base,
      id: ADMIN_ID.national,
      fullname: 'Administrateur national',
      email: 'national@mec-ci.org',
      phone: '+2250101010101',
      role: 'ADMIN_NATIONAL',
    },
  });

  const communication = await prisma.admin.upsert({
    where: { id: ADMIN_ID.communication },
    update: {},
    create: {
      ...base,
      id: ADMIN_ID.communication,
      fullname: 'Chargée de communication',
      email: 'communication@mec-ci.org',
      phone: '+2250101010102',
      role: 'CHARGE_COMMUNICATION',
    },
  });

  const moderation = await prisma.admin.upsert({
    where: { id: ADMIN_ID.moderation },
    update: {},
    create: {
      ...base,
      id: ADMIN_ID.moderation,
      fullname: 'Modérateur',
      email: 'moderation@mec-ci.org',
      phone: '+2250101010103',
      role: 'MODERATEUR',
    },
  });

  console.log('✅ Admins seeded');
  return { national, communication, moderation };
}
