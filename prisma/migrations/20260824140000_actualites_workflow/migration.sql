-- Workflow editorial des actualites : le defaut bascule sur BROUILLON.
--
-- La migration split_admin_member posait DEFAULT 'PUBLIEE' pour ne pas
-- depublier l'existant. Maintenant que la colonne est remplie, une nouvelle
-- actualite doit naitre en brouillon et etre publiee par une action explicite.

-- AlterTable
ALTER TABLE "actualites" ALTER COLUMN "statut" SET DEFAULT 'BROUILLON';

-- ---------------------------------------------------------------------------
-- Recherche plein texte
--
-- La recherche utilise le full-text natif de Postgres via `search:` de Prisma,
-- sans qu'aucun index GIN n'ait jamais ete cree : chaque requete faisait un
-- seq scan en recalculant to_tsvector sur chaque ligne.
--
-- Prisma genere `to_tsvector(<default_text_search_config>, "colonne")`, par
-- colonne. Les index doivent donc porter exactement cette expression, et la
-- configuration par defaut de la base doit correspondre — d'ou le ALTER
-- DATABASE ci-dessous.
--
-- A verifier avec EXPLAIN ANALYZE sur la requete reellement emise : si le
-- planificateur reste en seq scan, basculer la recherche sur un $queryRaw
-- avec websearch_to_tsquery.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  EXECUTE format(
    'ALTER DATABASE %I SET default_text_search_config = ''pg_catalog.french''',
    current_database()
  );
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'default_text_search_config non modifiee (privileges insuffisants) : verifier la configuration de la base.';
END
$$;

CREATE INDEX IF NOT EXISTS "actualites_title_fts_idx"
  ON "actualites" USING GIN (to_tsvector('french', "title"));

CREATE INDEX IF NOT EXISTS "actualites_excerpt_fts_idx"
  ON "actualites" USING GIN (to_tsvector('french', "excerpt"));

CREATE INDEX IF NOT EXISTS "actualites_content_fts_idx"
  ON "actualites" USING GIN (to_tsvector('french', "content"));
