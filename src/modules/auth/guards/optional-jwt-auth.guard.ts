import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard JWT optionnel : tente de résoudre l'utilisateur si un token valide est présent,
 * mais ne bloque pas la requête en l'absence de token (routes publiques).
 * Utile pour exposer `likedByMe` sur les routes GET publiques.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // On surcharge handleRequest pour ne jamais lever d'exception :
  // si aucun utilisateur n'est résolu, on retourne simplement undefined.
  handleRequest(err: any, user: any) {
    return user || undefined;
  }
}
