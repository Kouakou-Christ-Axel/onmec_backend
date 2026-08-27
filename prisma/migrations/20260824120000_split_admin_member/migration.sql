-- Separation des comptes back-office (`admins`) et des comptes citoyens (`members`).
--
-- Cette migration est ECRITE A LA MAIN. Le diff genere automatiquement par Prisma
-- produit `DROP TABLE "users"` + `CREATE TABLE "members"`, ce qui detruirait les
-- donnees et les 10 cles etrangeres entrantes. On utilise ALTER TABLE ... RENAME :
-- Postgres suit l'OID de la table, donc toutes les FK entrantes survivent.
--
-- Ne pas regenerer ce fichier avec `migrate dev` : le verifier avec
--   prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma
-- qui doit renvoyer un diff VIDE.

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN_NATIONAL', 'CHARGE_COMMUNICATION', 'MODERATEUR');

-- CreateEnum
CREATE TYPE "StatutMembre" AS ENUM ('ACTIF', 'SUSPENDU', 'BANNI');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "StatutActualite" AS ENUM ('BROUILLON', 'PUBLIEE', 'ARCHIVEE');

-- ---------------------------------------------------------------------------
-- 1. users -> members
--    Le RENAME preserve les 8 FK entrantes (signalements, quiz, notifications,
--    device tokens, reactions, commentaires, gamification, transactions).
--    Les index NE SONT PAS renommes automatiquement : sans les ALTER INDEX
--    ci-dessous, le prochain `migrate dev` detecte une derive et propose un reset.
-- ---------------------------------------------------------------------------
ALTER TABLE "users" RENAME TO "members";
ALTER INDEX "users_pkey" RENAME TO "members_pkey";
ALTER INDEX "users_email_key" RENAME TO "members_email_key";

-- AlterTable
ALTER TABLE "members"
  ADD COLUMN "otpPurpose"       "OtpPurpose",
  ADD COLUMN "otpExpiresAt"     TIMESTAMP(3),
  ADD COLUMN "statut"           "StatutMembre" NOT NULL DEFAULT 'ACTIF',
  ADD COLUMN "suspendedAt"      TIMESTAMP(3),
  ADD COLUMN "suspensionRaison" TEXT,
  ADD COLUMN "suspendedById"    UUID;

-- ---------------------------------------------------------------------------
-- 2. Dessurcharge de `deletedAt`
--    L'ancien `PATCH /users/:id/lock` ecrivait dans `deletedAt` : le verrou et
--    le soft-delete partageaient le meme champ. Les comptes ainsi verrouilles
--    deviennent SUSPENDU, et `deletedAt` est rendu a son seul usage
--    (suppression de compte).
-- ---------------------------------------------------------------------------
UPDATE "members"
   SET "statut"      = 'SUSPENDU',
       "suspendedAt" = "deletedAt",
       "deletedAt"   = NULL
 WHERE "deletedAt" IS NOT NULL;

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "fullname" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "phone" VARCHAR,
    "password" VARCHAR NOT NULL,
    "role" "AdminRole" NOT NULL,
    "avatar" VARCHAR,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "otpSecret" VARCHAR,
    "otpPurpose" "OtpPurpose",
    "otpExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "admins_role_idx" ON "admins"("role");

-- CreateIndex
CREATE INDEX "members_statut_idx" ON "members"("statut");

-- CreateIndex
CREATE INDEX "members_deletedAt_idx" ON "members"("deletedAt");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_suspendedById_fkey" FOREIGN KEY ("suspendedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Document.uploadedById : users -> admins
--    La librairie est alimentee depuis le back-office. Les references
--    existantes pointaient sur des comptes qui deviennent des membres :
--    on les remet a NULL (la colonne est deja nullable).
-- ---------------------------------------------------------------------------
UPDATE "Document" SET "uploadedById" = NULL WHERE "uploadedById" IS NOT NULL;
ALTER TABLE "Document" DROP CONSTRAINT "Document_uploadedById_fkey";
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 4. Quiz.authorId : users -> admins, et passage en nullable
--    Obligatoire : `POST /quizz` est reserve aux admins, or un admin n'a plus
--    de ligne dans `members`. Sans le repointage, toute creation de quiz
--    violerait la contrainte.
-- ---------------------------------------------------------------------------
ALTER TABLE "Quiz" ALTER COLUMN "authorId" DROP NOT NULL;
UPDATE "Quiz" SET "authorId" = NULL WHERE "authorId" IS NOT NULL;
ALTER TABLE "Quiz" DROP CONSTRAINT "Quiz_authorId_fkey";
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 5. user_gamification : suppression de l'index unique redondant
--    La table portait a la fois une PRIMARY KEY et un index UNIQUE sur
--    `userId`. La PK est conservee, le doublon est supprime.
-- ---------------------------------------------------------------------------
DROP INDEX "user_gamification_userId_key";

-- ---------------------------------------------------------------------------
-- 6. Actualite -> actualites
--    Aligne le nom de table sur la convention snake_case du reste du schema,
--    et pose les colonnes du workflow editorial (exploitees en phase C).
--    `statut` prend PUBLIEE par defaut ICI pour ne pas depublier l'existant ;
--    le defaut bascule sur BROUILLON en phase C.
-- ---------------------------------------------------------------------------
ALTER TABLE "Actualite" RENAME TO "actualites";
ALTER INDEX "Actualite_pkey" RENAME TO "actualites_pkey";
ALTER INDEX "Actualite_slug_key" RENAME TO "actualites_slug_key";

-- DropIndex : doublon de "actualites_slug_key"
DROP INDEX "Actualite_slug_idx";

-- AlterTable
ALTER TABLE "actualites"
  ADD COLUMN "statut"      "StatutActualite" NOT NULL DEFAULT 'PUBLIEE',
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt"   TIMESTAMP(3),
  ADD COLUMN "authorId"    UUID;

-- L'existant est repute publie : on adosse la date de publication a `date`.
UPDATE "actualites" SET "publishedAt" = "date" WHERE "publishedAt" IS NULL;

-- CreateIndex
CREATE INDEX "actualites_statut_date_idx" ON "actualites"("statut", "date" DESC);

-- CreateIndex
CREATE INDEX "actualites_deletedAt_idx" ON "actualites"("deletedAt");

-- AddForeignKey
ALTER TABLE "actualites" ADD CONSTRAINT "actualites_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
