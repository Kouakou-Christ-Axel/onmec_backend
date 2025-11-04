import { Injectable } from '@nestjs/common/decorators';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';

@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard('jwt-refresh') {
  constructor() {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const result = (await super.canActivate(
      context,
    )) as unknown as Promise<boolean>;

    // Si l'utilisateur est authentifié
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;

    // Si l'utilisateur est supprimé
    if (user.deletedAt) {
      throw new UnauthorizedException('Utilisateur supprimé');
    }
    return result;
  }

  // Gestion de la requête
  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
