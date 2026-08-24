-- Retrait du dernier vestige du modele unifie.
--
-- Le role d'un acteur est desormais porte par sa table : un compte dans
-- `admins` porte un `AdminRole`, un compte dans `members` est un membre par
-- construction. La colonne `members.role` et l'enum `UserRole` n'ont plus
-- d'usage, et le seul code qui les lisait (AdminGuard, permissionsByRole,
-- UserRolesGuard) a ete remplace par le type d'acteur du JWT.
--
-- Non destructif pour les donnees metier : la migration precedente a deja
-- bascule tous les comptes existants en membres.

-- AlterTable
ALTER TABLE "members" DROP COLUMN "role";

-- DropEnum
DROP TYPE "UserRole";
