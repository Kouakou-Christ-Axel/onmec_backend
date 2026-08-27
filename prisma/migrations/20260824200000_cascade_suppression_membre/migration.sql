-- Cascades manquantes sur la suppression definitive d'un membre.
--
-- DELETE /users/delete/:id renvoyait un 500 (P2003) des lors que le membre
-- avait passe un seul quiz : UserQuiz.userId etait en RESTRICT, et
-- UserAnswer.userQuizId aussi -- soit deux maillons a poser, pas un.
--
-- DeviceToken passe egalement en cascade : supprimer un compte doit retirer
-- ses appareils, sinon ils resteraient enregistres sans destinataire.
--
-- SignalementCitoyen.citoyenId reste volontairement en SET NULL : un
-- signalement est un contenu civique qui garde sa valeur une fois son auteur
-- parti, il est anonymise et non detruit.

-- DropForeignKey
ALTER TABLE "DeviceToken" DROP CONSTRAINT "DeviceToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserAnswer" DROP CONSTRAINT "UserAnswer_userQuizId_fkey";

-- DropForeignKey
ALTER TABLE "UserQuiz" DROP CONSTRAINT "UserQuiz_userId_fkey";

-- AddForeignKey
ALTER TABLE "UserQuiz" ADD CONSTRAINT "UserQuiz_userId_fkey" FOREIGN KEY ("userId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_userQuizId_fkey" FOREIGN KEY ("userQuizId") REFERENCES "UserQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

