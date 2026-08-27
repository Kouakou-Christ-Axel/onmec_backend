import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/database/services/prisma.service';
import {
  AuthenticatedActor,
  JwtPayload,
  MEMBER_ROLE,
} from 'src/common/types/authenticated-actor';

/**
 * Champs remontes dans `req.user`.
 *
 * La selection est EXPLICITE et non un `const { password, ...rest } = user`.
 * L'ancienne version laissait passer `otpSecret` dans `req.user` (et donc dans
 * les reponses qui reexposaient l'objet) : tout nouveau champ sensible ajoute
 * au modele fuirait automatiquement. Ici, il faut l'ajouter volontairement.
 */
const ADMIN_SELECT = {
  id: true,
  email: true,
  fullname: true,
  phone: true,
  avatar: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  deletedAt: true,
} as const;

const MEMBER_SELECT = {
  id: true,
  email: true,
  fullname: true,
  phone: true,
  avatar: true,
  statut: true,
  emailVerified: true,
  deletedAt: true,
} as const;

/**
 * Resout le porteur du token vers la table correspondante.
 *
 * Le controle de statut est fait ICI plutot que dans un guard, pour deux
 * raisons : il s'applique alors aussi bien a `JwtAuthGuard` qu'a
 * `OptionalJwtAuthGuard`, et une suspension prononcee par un moderateur est
 * effective sur les tokens deja emis — sinon le role Moderateur serait
 * purement decoratif jusqu'a l'expiration du JWT.
 */
export async function resolveActor(
  prisma: PrismaService,
  payload: JwtPayload,
): Promise<AuthenticatedActor> {
  if (!payload?.sub) {
    throw new UnauthorizedException('Token invalide');
  }

  if (payload.type === 'admin') {
    const admin = await prisma.admin.findUnique({
      where: { id: payload.sub },
      select: ADMIN_SELECT,
    });

    if (!admin || admin.deletedAt) {
      throw new UnauthorizedException('Compte administrateur introuvable');
    }
    if (!admin.isActive) {
      throw new ForbiddenException('Compte administrateur désactivé');
    }

    return {
      id: admin.id,
      type: 'admin',
      role: admin.role,
      email: admin.email,
      fullname: admin.fullname,
      phone: admin.phone,
      avatar: admin.avatar,
      isActive: admin.isActive,
      mustChangePassword: admin.mustChangePassword,
    };
  }

  const member = await prisma.member.findUnique({
    where: { id: payload.sub },
    select: MEMBER_SELECT,
  });

  if (!member || member.deletedAt) {
    throw new UnauthorizedException('Utilisateur non trouvé');
  }
  if (member.statut !== 'ACTIF') {
    throw new ForbiddenException(
      member.statut === 'BANNI' ? 'Compte banni' : 'Compte suspendu',
    );
  }

  return {
    id: member.id,
    type: 'member',
    role: MEMBER_ROLE,
    email: member.email,
    fullname: member.fullname,
    phone: member.phone,
    avatar: member.avatar,
    statut: member.statut,
    emailVerified: member.emailVerified,
  };
}
