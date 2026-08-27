-- Fil de notifications in-app.
--
-- La table existait mais n'etait jamais ecrite : le module notification ne
-- faisait qu'emettre des push Firebase, sans rien persister. Une push manquee
-- etait donc definitivement perdue et l'application mobile n'avait aucun ecran
-- notifications a alimenter.
--
-- `lien` porte le chemin cote front vers le contenu concerne, `readAt` date la
-- lecture, et la cascade sur le membre evite qu'une suppression de compte
-- echoue en RESTRICT sur ses notifications.

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "lien" TEXT,
ADD COLUMN     "readAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

