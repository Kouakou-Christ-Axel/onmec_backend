-- Cle d'idempotence des attributions de points.
--
-- Les lignes existantes recoivent source = AJUSTEMENT_MANUEL et sourceId NULL :
-- Postgres considerant les NULL comme distincts, l'index unique ci-dessous ne
-- peut pas entrer en conflit avec l'historique deja en base.

-- CreateEnum
CREATE TYPE "PointSource" AS ENUM ('SIGNALEMENT_DEPOSE', 'SIGNALEMENT_VALIDE', 'QUIZ_TERMINE', 'COMMENTAIRE', 'LIKE', 'AJUSTEMENT_MANUEL');

-- AlterTable
ALTER TABLE "point_transactions" ADD COLUMN     "source" "PointSource" NOT NULL DEFAULT 'AJUSTEMENT_MANUEL',
ADD COLUMN     "sourceId" UUID;

-- CreateIndex
CREATE INDEX "point_transactions_userId_source_createdAt_idx" ON "point_transactions"("userId", "source", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "point_transactions_userId_source_sourceId_key" ON "point_transactions"("userId", "source", "sourceId");

