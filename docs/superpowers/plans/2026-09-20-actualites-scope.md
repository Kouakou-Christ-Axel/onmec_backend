# Champ de diffusion des actualités (`scope`) — Implementation Plan

**Goal:** Ajouter un champ `scope` (`WEB` défaut / `MOBILE` / `BOTH`) sur les actualités, et faire
respecter ce scope par les routes de lecture publique via un paramètre `platform`.

**Design:** `docs/superpowers/specs/2026-09-20-actualites-scope-design.md`

**Tech Stack:** NestJS, Prisma (PostgreSQL), class-validator

---

## Fichiers créés / modifiés

| Action   | Fichier |
| -------- | ------- |
| Modifier | `prisma/schema.prisma` |
| Créer    | `prisma/migrations/<timestamp>_actualites_scope/migration.sql` |
| Modifier | `src/modules/actualites/dto/create-actualite.dto.ts` |
| Modifier | `src/modules/actualites/dto/actualite-response.dto.ts` |
| Modifier | `src/modules/actualites/dto/actualites-search.dto.ts` |
| Modifier | `src/modules/actualites/actualites.service.ts` |
| Modifier | `src/modules/actualites/actualites.controller.ts` |
| Modifier | `src/modules/actualites/actualites.service.spec.ts` |

---

### Task 1: Modèle et migration

- [ ] **Step 1:** Ajouter `enum ScopeActualite { WEB MOBILE BOTH }` dans `prisma/schema.prisma`,
      champ `scope ScopeActualite @default(WEB)` sur `model Actualite`, index `@@index([scope])`.
- [ ] **Step 2:** Générer la migration (`npx prisma migrate dev --name actualites_scope` en local,
      ou écrire le SQL à la main sur le patron de `20260824140000_actualites_workflow` si pas de
      base locale disponible). Régénérer le client Prisma.

### Task 2: DTOs

- [ ] **Step 1:** `create-actualite.dto.ts` — ajouter `scope?: ScopeActualite` avec
      `@IsOptional() @IsEnum(ScopeActualite)` et `@ApiPropertyOptional({ enum: ScopeActualite })`.
- [ ] **Step 2:** `actualite-response.dto.ts` — ajouter `scope: ScopeActualite` avec
      `@ApiProperty({ enum: ScopeActualite, example: ScopeActualite.WEB })`.
- [ ] **Step 3:** `actualites-search.dto.ts` — ajouter `scope?: ScopeActualite` (filtre exact,
      `@IsOptional() @IsEnum(ScopeActualite)`) et `platform?: 'WEB' | 'MOBILE'` (
      `@IsOptional() @IsIn(['WEB', 'MOBILE'])`, avec commentaire précisant que ce champ ne
      s'applique qu'aux routes publiques).

### Task 3: Service — filtrage de visibilité

- [ ] **Step 1:** `visibilityFilter(actor?, platform: 'WEB' | 'MOBILE' = 'WEB')` — quand
      `!canSeeDrafts`, ajouter `scope: { in: [platform === 'MOBILE' ? ScopeActualite.MOBILE : ScopeActualite.WEB, ScopeActualite.BOTH] }`
      à la clause `where` retournée.
- [ ] **Step 2:** `findAll` — passer `query?.platform` à `visibilityFilter` ; appliquer en plus le
      filtre exact `where.scope = query.scope` quand `query?.scope` est fourni (même style que le
      filtre `categorie` existant), indépendamment de la plateforme.
- [ ] **Step 3:** `findOne`, `findBySlug` — accepter un paramètre `platform?: 'WEB' | 'MOBILE'` et
      le transmettre à `visibilityFilter`.

### Task 4: Contrôleur

- [ ] **Step 1:** `GET /actualites` (`findAll` public) — `platform` est déjà porté par
      `ActualitesSearchDto`, rien à ajouter côté signature.
- [ ] **Step 2:** `GET /actualites/:id` et `GET /actualites/slug/:slug` — ajouter
      `@Query('platform') platform?: 'WEB' | 'MOBILE'` (valider via un petit DTO partagé
      `PlateformeQueryDto` avec `@IsOptional() @IsIn(['WEB', 'MOBILE'])`, réutilisé aussi comme
      base de `ActualitesSearchDto.platform` pour éviter la duplication de validation) et le
      transmettre au service.
- [ ] **Step 3:** `GET /actualites/admin` (`findAllAdmin`) — inchangé (pas de filtre plateforme
      implicite pour les éditeurs).

### Task 5: Tests

- [ ] **Step 1:** `actualites.service.spec.ts` — cas : création sans `scope` → `WEB` en base ;
      `findAll` sans `platform` exclut les `MOBILE` ; `findAll({ platform: 'MOBILE' })` inclut
      `MOBILE`/`BOTH` et exclut les `WEB` (hors `BOTH`) ; un acteur éditorial voit tout quel que
      soit `platform`.
- [ ] **Step 2:** `pnpm run test` (ou l'équivalent du repo) sur le module `actualites`.

## Vérification manuelle

- Créer une actualité `scope=MOBILE`, la publier via `PATCH /actualites/:id/publier`.
- `GET /actualites` (sans `platform`) : l'actualité n'apparaît pas.
- `GET /actualites?platform=MOBILE` : elle apparaît.
- `GET /actualites/admin` (compte éditorial) : elle apparaît quel que soit son scope.
