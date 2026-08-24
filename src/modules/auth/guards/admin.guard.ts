import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthenticatedActor } from 'src/common/types/authenticated-actor';

/**
 * Exige un compte back-office, quel que soit son role.
 *
 * N'authentifie pas : doit toujours etre combine a `JwtAuthGuard`.
 * Pour restreindre a certains roles, ajouter `AdminRolesGuard` + `@AdminRoles(...)`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedActor | undefined;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    if (user.type !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }

    return true;
  }
}
