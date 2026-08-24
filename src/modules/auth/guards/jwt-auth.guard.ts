import { Injectable } from '@nestjs/common/decorators';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedException } from '@nestjs/common';

/**
 * Exige un acteur authentifie, admin ou membre.
 *
 * Les controles de cycle de vie (compte supprime, membre suspendu ou banni,
 * admin desactive) sont faits dans la strategie, donc appliques aussi bien ici
 * que sur `OptionalJwtAuthGuard`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, _info) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentification requise');
    }
    return user;
  }
}
