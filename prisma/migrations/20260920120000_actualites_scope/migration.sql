-- Canal de diffusion des actualites : web uniquement (defaut), mobile
-- uniquement, ou les deux. Le defaut WEB preserve le comportement actuel de
-- l'existant (seul le site web consomme l'API aujourd'hui).

-- CreateEnum
CREATE TYPE "ScopeActualite" AS ENUM ('WEB', 'MOBILE', 'BOTH');

-- AlterTable
ALTER TABLE "actualites" ADD COLUMN "scope" "ScopeActualite" NOT NULL DEFAULT 'WEB';

-- CreateIndex
CREATE INDEX "actualites_scope_idx" ON "actualites"("scope");
