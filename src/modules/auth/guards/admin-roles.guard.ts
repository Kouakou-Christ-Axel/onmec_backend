import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '../../../generated/prisma/client';
import { AuthenticatedActor } from 'src/common/types/authenticated-actor';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';

/**
 * Applique `@AdminRoles(...)`.
 *
 * Fail-closed : des qu'une contrainte de role est declaree, tout ce qui n'est
 * pas un admin portant l'un de ces roles est refuse. L'ancien
 * `UserRolesGuard` faisait l'inverse — il retournait `true` quand le role de
 * l'utilisateur etait absent.
 */
@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Aucune contrainte declaree : ce guard ne se prononce pas.
    if (!required || required.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest()
      .user as AuthenticatedActor | undefined;

    if (!user || user.type !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }

    if (!required.includes(user.role as AdminRole)) {
      throw new ForbiddenException(
        "Votre rôle ne permet pas d'effectuer cette action",
      );
    }

    return true;
  }
}
