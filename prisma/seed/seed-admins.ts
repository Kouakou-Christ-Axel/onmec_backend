import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../../src/generated/prisma/client';

// UUID fixes : le seed doit rester rejouable (la CI le lance a chaque deploiement).
export const ADMIN_ID = {
  national:      '10000000-0000-0000-0000-000000000001',
  communication: '10000000-0000-0000-0000-000000000002',
  moderation:    '10000000-0000-0000-0000-000000000003',
};

const ADMINS = [
  {
    id: ADMIN_ID.national,
    fullname: 'Administrateur national',
    email: 'national@mec-ci.org',
    phone: '+2250101010101',
    role: 'ADMIN_NATIONAL' as const,
  },
  {
    id: ADMIN_ID.communication,
    fullname: 'Chargée de communication',
    email: 'communication@mec-ci.org',
    phone: '+2250101010102',
    role: 'CHARGE_COMMUNICATION' as const,
  },
  {
    id: ADMIN_ID.moderation,
    fullname: 'Modérateur',
    email: 'moderation@mec-ci.org',
    phone: '+2250101010103',
    role: 'MODERATEUR' as const,
  },
];

/**
 * Mot de passe initial des comptes back-office.
 *
 * Pas de valeur par defaut en production : un administrateur national dont le
 * mot de passe est publie dans le depot serait une porte ouverte.
 *
 * `null` signifie « pas de mot de passe disponible » — l'appelant decide alors
 * s'il peut se passer d'amorcer les comptes.
 */
function resolveSeedPassword(): string | null {
  const fromEnv = process.env.SEED_ADMIN_PASSWORD;
  if (fromEnv && fromEnv.length > 0) return fromEnv;

  if (process.env.NODE_ENV === 'production') return null;

  console.warn(
    '⚠️  SEED_ADMIN_PASSWORD absent : utilisation du mot de passe de developpement "ChangeMoi!2026".',
  );
  return 'ChangeMoi!2026';
}

/**
 * Amorce les trois comptes back-office.
 *
 * Idempotent : les comptes existants ne sont pas modifies (`update: {}`), donc
 * un mot de passe deja change par son titulaire n'est jamais ecrase.
 *
 * En production sans SEED_ADMIN_PASSWORD, on ne throw QUE s'il faut reellement
 * creer un compte. Si les admins existent deja, il n'y a rien a faire et le
 * deploiement ne doit pas echouer pour autant — la CI rejoue ce seed a chaque
 * push.
 */
export async function seedAdmins(prisma: PrismaClient) {
  const password = resolveSeedPassword();

  if (password === null) {
    const existants = await prisma.admin.count();
    if (existants > 0) {
      console.log(
        `ℹ️  Admins deja presents (${existants}) et SEED_ADMIN_PASSWORD absent : amorcage ignore.`,
      );
      return null;
    }
    throw new Error(
      'Aucun compte back-office en base et SEED_ADMIN_PASSWORD non defini. ' +
        'Definir SEED_ADMIN_PASSWORD pour creer les comptes administrateurs initiaux.',
    );
  }

  const hash = await bcrypt.hash(password, await bcrypt.genSalt());

  // `mustChangePassword: true` : le mot de passe issu du seed est partage,
  // il doit etre remplace a la premiere connexion.
  const created: Record<string, { id: string }> = {};
  for (const admin of ADMINS) {
    created[admin.role] = await prisma.admin.upsert({
      where: { id: admin.id },
      update: {},
      create: {
        ...admin,
        password: hash,
        mustChangePassword: true,
        isActive: true,
      },
    });
  }

  console.log('✅ Admins seeded');

  return {
    national: created['ADMIN_NATIONAL'],
    communication: created['CHARGE_COMMUNICATION'],
    moderation: created['MODERATEUR'],
  };
}
