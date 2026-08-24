-- Index de recherche plein texte reellement utilisable.
--
-- La migration precedente creait trois index GIN par colonne, en supposant que
-- Prisma generait `to_tsvector(<config>, "colonne")`. La verification par
-- journalisation SQL montre qu'il n'en est rien : le filtre `search` de Prisma
-- produit
--
--   to_tsvector(concat_ws(' ', "excerpt", "content", "title")) @@ to_tsquery($1)
--
-- soit la forme A UN SEUL ARGUMENT de to_tsvector. Celle-ci depend du GUC
-- default_text_search_config, elle est donc STABLE et non IMMUTABLE : Postgres
-- refuse de l'indexer, et aucun index ne pourra jamais servir cette requete.
-- Les trois index precedents etaient donc du poids mort.
--
-- On pose a la place un index d'expression sur la forme immutable a deux
-- arguments, et la recherche passe par $queryRaw en reprenant exactement cette
-- expression (voir ActualitesService.searchMatchingIds).

DROP INDEX IF EXISTS "actualites_title_fts_idx";
DROP INDEX IF EXISTS "actualites_excerpt_fts_idx";
DROP INDEX IF EXISTS "actualites_content_fts_idx";

CREATE INDEX IF NOT EXISTS "actualites_fts_idx"
  ON "actualites"
  USING GIN (
    to_tsvector(
      'french',
      coalesce("title", '') || ' ' || coalesce("excerpt", '') || ' ' || coalesce("content", '')
    )
  );
