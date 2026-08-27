import { AdminRole } from '../../generated/prisma/client';
import { ActorRole, MEMBER_ROLE } from '../types/authenticated-actor';

/**
 * Capacites exposees au front, sous forme de slugs `domaine:action`.
 *
 * Cette liste est DESCRIPTIVE : elle sert au front a afficher ou masquer des
 * elements d'interface. L'autorisation reelle est appliquee cote serveur par
 * `AdminGuard` + `@AdminRoles(...)` sur chaque route. Ne jamais s'y fier seule.
 *
 * Remplace `permissionsByRole`, qui accordait exactement les memes droits a
 * ADMIN et MEMBER et n'etait donc branche sur rien.
 */
export const CAPABILITIES = {
  ACTUALITE_READ: 'actualite:read',
  ACTUALITE_WRITE: 'actualite:write',
  ACTUALITE_PUBLISH: 'actualite:publish',
  ACTUALITE_DELETE: 'actualite:delete',
  /** Voir les brouillons et les actualites archivees (previsualisation). */
  ACTUALITE_PREVIEW: 'actualite:preview',

  /** Liker et commenter : reserve aux membres. */
  ENGAGEMENT_WRITE: 'engagement:write',
  COMMENTAIRE_MODERATE: 'commentaire:moderate',

  MEMBER_READ: 'member:read',
  MEMBER_SUSPEND: 'member:suspend',
  MEMBER_DELETE: 'member:delete',

  SIGNALEMENT_MODERATE: 'signalement:moderate',

  ADMIN_MANAGE: 'admin:manage',
  LIBRAIRIE_MANAGE: 'librairie:manage',
  QUIZ_MANAGE: 'quiz:manage',
} as const;

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

const C = CAPABILITIES;

export const capabilitiesByRole: Record<ActorRole, Capability[]> = {
  [AdminRole.ADMIN_NATIONAL]: [
    C.ACTUALITE_READ,
    C.ACTUALITE_WRITE,
    C.ACTUALITE_PUBLISH,
    C.ACTUALITE_DELETE,
    C.ACTUALITE_PREVIEW,
    C.COMMENTAIRE_MODERATE,
    C.MEMBER_READ,
    C.MEMBER_SUSPEND,
    C.MEMBER_DELETE,
    C.SIGNALEMENT_MODERATE,
    C.ADMIN_MANAGE,
    C.LIBRAIRIE_MANAGE,
    C.QUIZ_MANAGE,
  ],

  [AdminRole.CHARGE_COMMUNICATION]: [
    C.ACTUALITE_READ,
    C.ACTUALITE_WRITE,
    C.ACTUALITE_PUBLISH,
    C.ACTUALITE_DELETE,
    C.ACTUALITE_PREVIEW,
    C.COMMENTAIRE_MODERATE,
    C.LIBRAIRIE_MANAGE,
  ],

  [AdminRole.MODERATEUR]: [
    C.ACTUALITE_READ,
    C.COMMENTAIRE_MODERATE,
    C.MEMBER_READ,
    C.MEMBER_SUSPEND,
    C.SIGNALEMENT_MODERATE,
  ],

  [MEMBER_ROLE]: [C.ACTUALITE_READ, C.ENGAGEMENT_WRITE],
};

export function capabilitiesFor(role: ActorRole): Capability[] {
  return capabilitiesByRole[role] ?? [];
}

/**
 * Ancien champ `permissions` des reponses d'authentification.
 *
 * Conserve a l'identique UNIQUEMENT pour ne pas casser le front deja livre :
 * `permissionsByRole` renvoyait exactement cet objet, et le meme pour ADMIN et
 * pour MEMBER. Il n'a jamais servi a autoriser quoi que ce soit.
 *
 * Le front doit migrer vers `capabilities`. A supprimer une fois fait.
 *
 * @deprecated Utiliser `capabilities`.
 */
export const LEGACY_PERMISSIONS = {
  modules: { ALL: ['create', 'read', 'update', 'delete'] },
} as const;
