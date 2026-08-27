-- Contrainte d'exclusivite sur les deux tables polymorphes.
--
-- `reactions` et `commentaires` ciblent SOIT un signalement SOIT une actualite,
-- via deux colonnes nullables. Rien n'empechait jusqu'ici une ligne avec les
-- deux cibles nulles (invisible de toute lecture, puisque chaque requete filtre
-- sur une cible) ou avec les deux renseignees (comptabilisee deux fois par
-- getEngagementStats, et affichee sous deux contenus differents en moderation).
--
-- Prisma ne modelise pas les contraintes CHECK : cette migration est ecrite a
-- la main et `migrate diff` restera vide, c'est attendu.

-- Lignes sans aucune cible : orphelines par construction, aucune requete de
-- l'application ne peut les retourner. Purge sans perte fonctionnelle.
DELETE FROM "reactions"    WHERE "signalementId" IS NULL AND "actualiteId" IS NULL;
DELETE FROM "commentaires" WHERE "signalementId" IS NULL AND "actualiteId" IS NULL;

-- Lignes avec DEUX cibles : volontairement non traitees. Le code ne peut pas en
-- produire (targetWhere renseigne exactement une colonne) et choisir
-- automatiquement laquelle conserver serait une perte de donnees arbitraire. Si
-- une telle ligne existe, l'ajout de la contrainte echoue avec un message
-- explicite -- c'est le comportement voulu.

ALTER TABLE "reactions"
  ADD CONSTRAINT "reactions_cible_exclusive"
  CHECK (num_nonnulls("signalementId", "actualiteId") = 1);

ALTER TABLE "commentaires"
  ADD CONSTRAINT "commentaires_cible_exclusive"
  CHECK (num_nonnulls("signalementId", "actualiteId") = 1);
