-- Journal de suivi d'un signalement : mises a jour texte postees par un
-- admin, visibles par le citoyen dans l'app mobile.
--
-- signalementId est en CASCADE : SignalementCitoyenService.remove() fait un
-- vrai hard delete (`prisma.signalementCitoyen.delete()`), donc sans cascade,
-- supprimer un signalement ayant des mises a jour echouerait en violation de
-- contrainte de cle etrangere.
--
-- auteurId reste nullable, sans onDelete explicite (donc SET NULL par
-- defaut) : meme convention que Quiz.authorId, Actualite.authorId et
-- Document.uploadedById -- Admin est soft-delete via `deletedAt`, jamais
-- hard-delete, donc cette colonne ne se retrouve jamais orpheline en
-- pratique.

-- CreateTable
CREATE TABLE "signalement_updates" (
    "id" UUID NOT NULL,
    "signalementId" UUID NOT NULL,
    "auteurId" UUID,
    "texte" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signalement_updates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "signalement_updates" ADD CONSTRAINT "signalement_updates_signalementId_fkey" FOREIGN KEY ("signalementId") REFERENCES "signalements_citoyens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signalement_updates" ADD CONSTRAINT "signalement_updates_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
