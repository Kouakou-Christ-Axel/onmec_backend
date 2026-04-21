-- CreateEnum
CREATE TYPE "QuizDifficulte" AS ENUM ('FACILE', 'MOYEN', 'DIFFICILE');

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "categorieId" UUID,
ADD COLUMN     "difficulte" "QuizDifficulte";

-- CreateTable
CREATE TABLE "categories_quiz" (
    "id" UUID NOT NULL,
    "nom" VARCHAR NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_quiz_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "categories_quiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;
