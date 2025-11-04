import { UserRole } from '@prisma/client';
import { Modules } from '../enum/module-enum';
// chemin selon ton projet

export interface RolePermissions {
  modules: Partial<Record<Modules, string[]>>;
  exclusions?: Modules[];
}

export const permissionsByRole: Record<UserRole, RolePermissions> = {
  [UserRole.ADMIN]: {
    modules: {
      [Modules.ALL]: ['create', 'read', 'update', 'delete'],
    },
  },
  [UserRole.MEMBER]: {
    modules: {
      [Modules.ALL]: ['read', 'create', 'update', 'delete'],
    }
  }
};

