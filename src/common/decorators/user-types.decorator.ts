import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const USER_TYPES_KEY = 'user-types';
export const UserTypes = (...types: UserRole[]) => SetMetadata(USER_TYPES_KEY, types);
