import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/database/services/prisma.service';
import {
  AuthenticatedActor,
  JwtPayload,
} from 'src/common/types/authenticated-actor';
import { resolveActor } from './actor-resolver';

/**
 * Strategie unique, dispatchante sur `payload.type`.
 *
 * Deux strategies distinctes (`jwt-admin` / `jwt-member`) obligeraient a
 * dupliquer JwtAuthGuard, JwtRefreshAuthGuard et OptionalJwtAuthGuard — or ce
 * dernier doit accepter l'un OU l'autre acteur sur les GET publics
 * d'actualites, ce qui n'est pas exprimable proprement avec deux strategies
 * branchees sur le meme header.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('TOKEN_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedActor> {
    return resolveActor(this.prisma, payload);
  }
}
