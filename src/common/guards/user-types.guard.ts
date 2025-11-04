import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_TYPES_KEY } from 'src/common/decorators/user-types.decorator';
import { UserRole } from '@prisma/client';

@Injectable()
export class UserTypesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTypes = this.reflector.getAllAndOverride<UserRole[]>(
      USER_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredTypes) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }
    return requiredTypes.some((type) => user.type === type);
  }
}