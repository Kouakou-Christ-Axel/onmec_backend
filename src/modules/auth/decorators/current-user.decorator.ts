import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedActor } from 'src/common/types/authenticated-actor';

/**
 * Injecte `req.user` typé, en remplacement de `@Req() req` suivi d'un cast.
 *
 * Sur une route protegee par `OptionalJwtAuthGuard`, la valeur peut etre
 * `undefined` : la typer comme telle cote appelant.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedActor | undefined => {
    return ctx.switchToHttp().getRequest().user;
  },
);
