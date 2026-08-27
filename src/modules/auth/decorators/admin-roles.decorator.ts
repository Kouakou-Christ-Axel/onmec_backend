import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../../../generated/prisma/client';

export const ADMIN_ROLES_KEY = 'admin-roles';

/**
 * Restreint une route a certains roles back-office.
 * S'utilise avec `AdminRolesGuard`, apres `JwtAuthGuard`.
 */
export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);
