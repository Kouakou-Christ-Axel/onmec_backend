-- AlterTable
-- Ajoute le champ de modération soft des commentaires.
-- Les commentaires masqués (masque = true) restent en base mais sont exclus
-- des lectures publiques (listes et compteurs).
ALTER TABLE "commentaires" ADD COLUMN "masque" BOOLEAN NOT NULL DEFAULT false;
