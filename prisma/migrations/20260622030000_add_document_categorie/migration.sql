-- AlterTable
-- Ajoute une catégorie optionnelle aux documents de la librairie afin de
-- permettre le filtrage par catégorie côté application.
ALTER TABLE "Document" ADD COLUMN "categorie" TEXT;
