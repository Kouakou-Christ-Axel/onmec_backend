-- Classement editorial des actualites : une categorie fermee (au plus une par
-- actualite, geree au back-office) et des tags libres (plusieurs par actualite,
-- crees a la redaction).

-- AlterTable
ALTER TABLE "actualites" ADD COLUMN     "categorieId" UUID;

-- CreateTable
CREATE TABLE "categories_actualite" (
    "id" UUID NOT NULL,
    "nom" VARCHAR NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "categories_actualite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags_actualite" (
    "id" UUID NOT NULL,
    "nom" VARCHAR NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_actualite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ActualiteToTagActualite" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ActualiteToTagActualite_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_actualite_slug_key" ON "categories_actualite"("slug");

-- CreateIndex
CREATE INDEX "categories_actualite_deletedAt_idx" ON "categories_actualite"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tags_actualite_slug_key" ON "tags_actualite"("slug");

-- CreateIndex
CREATE INDEX "_ActualiteToTagActualite_B_index" ON "_ActualiteToTagActualite"("B");

-- CreateIndex
CREATE INDEX "actualites_categorieId_idx" ON "actualites"("categorieId");

-- AddForeignKey
ALTER TABLE "actualites" ADD CONSTRAINT "actualites_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "categories_actualite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActualiteToTagActualite" ADD CONSTRAINT "_ActualiteToTagActualite_A_fkey" FOREIGN KEY ("A") REFERENCES "actualites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActualiteToTagActualite" ADD CONSTRAINT "_ActualiteToTagActualite_B_fkey" FOREIGN KEY ("B") REFERENCES "tags_actualite"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Categorie de repli pour l'existant.
--
-- `categorieId` est nullable en base mais obligatoire a la creation : les
-- actualites deja publiees n'ont donc aucune valeur legitime, et les laisser a
-- NULL obligerait le front a traiter un cas qui ne se reproduira jamais. On
-- pose une categorie neutre et on l'y rattache.
--
-- L'identifiant est fixe pour que le seed puisse la reprendre sans la dupliquer.
INSERT INTO "categories_actualite" ("id", "nom", "slug", "description", "createdAt", "updatedAt")
VALUES (
  '20000000-0000-0000-0000-000000000001',
  'Actualites generales',
  'actualites-generales',
  'Categorie de repli des actualites anterieures au classement editorial.',
  now(), now()
)
ON CONFLICT ("id") DO NOTHING;

UPDATE "actualites"
   SET "categorieId" = '20000000-0000-0000-0000-000000000001'
 WHERE "categorieId" IS NULL;
