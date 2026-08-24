import { AdminRole, StatutMembre } from '../../generated/prisma/client';

/**
 * Type d'acteur porte par le JWT. Les deux flux d'authentification
 * (`/auth/login` et `/auth/admin/login`) emettent le meme format de token,
 * discrimine par ce champ.
 */
export type ActorType = 'admin' | 'member';

/** Role unique et implicite des comptes membres (ils n'en portent pas en base). */
export const MEMBER_ROLE = 'MEMBER' as const;

export type ActorRole = AdminRole | typeof MEMBER_ROLE;

/**
 * Contenu du JWT. `role` sert au front et au journal ; l'autorisation serveur
 * relit toujours la ligne en base (la strategie fait deja une requete par
 * requete HTTP), donc une revocation de role ou une suspension est effective
 * immediatement, sans attendre l'expiration du token.
 */
export interface JwtPayload {
  sub: string;
  type: ActorType;
  role: ActorRole;
  iat?: number;
  exp?: number;
}

/**
 * Forme normalisee de `req.user`, commune aux admins et aux membres.
 *
 * Les champs `id`, `email`, `fullname` et `role` restent presents pour que les
 * appelants existants continuent de fonctionner apres la separation des tables.
 */
export interface AuthenticatedActor {
  id: string;
  type: ActorType;
  role: ActorRole;
  email: string;
  fullname: string;
  phone: string | null;
  avatar: string | null;

  // Specifique aux membres
  statut?: StatutMembre;
  emailVerified?: boolean;

  // Specifique aux admins
  isActive?: boolean;
  mustChangePassword?: boolean;
}

/** Vrai si l'acteur est un compte back-office, quel que soit son role. */
export function isAdminActor(
  actor?: AuthenticatedActor | null,
): actor is AuthenticatedActor {
  return actor?.type === 'admin';
}

/** Vrai si l'acteur est un compte citoyen. */
export function isMemberActor(
  actor?: AuthenticatedActor | null,
): actor is AuthenticatedActor {
  return actor?.type === 'member';
}
