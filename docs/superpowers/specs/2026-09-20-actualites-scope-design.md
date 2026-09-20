# Actualités — champ de diffusion (`scope`)

## Contexte

Les actualités sont consommées par le site web (`onmec-site`) et, à terme, par une application
mobile (hors de ce repo). Aujourd'hui, `statut = PUBLIEE` rend une actualité visible partout sans
distinction de canal. Besoin : pouvoir réserver une actualité au web, au mobile, ou aux deux
(défaut : web), et faire respecter cette règle par les endpoints de lecture publique — pas
seulement l'exposer comme un champ cosmétique en admin.

## Décisions

- Nouvel enum Prisma `ScopeActualite { WEB MOBILE BOTH }`, colonne `scope` sur `Actualite`,
  `@default(WEB)` — même patron que `StatutActualite`/`statut`.
- Le filtrage de visibilité publique est fait au niveau de `ActualitesService.visibilityFilter`,
  pas dupliqué dans chaque contrôleur. Les rôles éditoriaux (`EDITORIAL_ROLES`) continuent de tout
  voir, y compris hors de leur plateforme — gérer le scope d'une actualité mobile depuis le
  back-office web doit rester possible.
- Un paramètre de requête `platform` (`WEB` | `MOBILE`) est ajouté aux routes de lecture publique
  (`GET /actualites`, `GET /actualites/:id`, `GET /actualites/slug/:slug`). Défaut `WEB` si absent
  — ce qui préserve le comportement actuel de `onmec-site`, qui n'envoie pas ce paramètre
  aujourd'hui, sans rien changer côté front tant qu'il n'est pas mis à jour. Un visiteur/membre
  filtré sur `platform=WEB` voit `scope IN (WEB, BOTH)` ; sur `MOBILE`, `scope IN (MOBILE, BOTH)`.
- La liste back-office (`GET /actualites/admin`) garde un filtre `scope` optionnel et exact
  (`ActualitesSearchDto.scope`) pour permettre de trier/filtrer la liste, mais n'applique **pas**
  de filtre de plateforme implicite — les éditeurs gèrent toutes les actualités quel que soit leur
  scope.
- Pas de nouvel endpoint dédié « scope » : le champ se lit/s'écrit comme les autres champs du
  DTO de création/édition existant (`CreateActualiteDto`/`UpdateActualiteDto`), et se filtre comme
  `statut` l'est déjà dans `ActualitesSearchDto`.

## Hors scope (explicite)

- Aucun client mobile réel n'existe dans ce repo : `platform=MOBILE` est un contrat prêt à être
  consommé, non testé contre un vrai client. Pas de round dédié à un module mobile.
- Pas de notification différenciée par scope (`notifications.diffuserATousLesMembres` reste
  déclenché à la publication, indépendamment du scope — hors sujet ici).
- Pas de filtre `scope` sur les tags/catégories ni sur la recherche plein texte.

## Contrat

### Modèle (`prisma/schema.prisma`)

```prisma
enum ScopeActualite {
  WEB
  MOBILE
  BOTH
}

model Actualite {
  // ...
  scope ScopeActualite @default(WEB)
  // ...
  @@index([scope])
}
```

Migration nommée `<timestamp>_actualites_scope`, sur le modèle de
`20260824140000_actualites_workflow` (ajout d'enum + colonne avec défaut, pas de backfill
nécessaire : le défaut `WEB` couvre l'existant, cohérent avec « par défaut c'est web seulement »).

### DTOs (`src/modules/actualites/dto/`)

- `CreateActualiteDto.scope?: ScopeActualite` — optionnel, `@IsEnum(ScopeActualite)`,
  `@IsOptional()`. Absent → la base pose `WEB` via le défaut de colonne.
- `UpdateActualiteDto` — hérite automatiquement (`PartialType`).
- `ActualiteResponseDto.scope: ScopeActualite` — toujours renvoyé (jamais nul, défaut en base).
- `ActualitesSearchDto` :
  - `scope?: ScopeActualite` — filtre exact, réservé en pratique au back-office (comme `statut`,
    pas appliqué sur la route publique où c'est `platform` qui gouverne la visibilité).
  - `platform?: 'WEB' | 'MOBILE'` — nouveau, `@IsOptional() @IsIn(['WEB', 'MOBILE'])`. Gouverne la
    visibilité sur les routes publiques uniquement (ignoré pour les rôles éditoriaux).

### Service (`actualites.service.ts`)

- `visibilityFilter(actor?, platform: 'WEB' | 'MOBILE' = 'WEB')` : ajoute
  `scope: { in: [platform, 'BOTH'] }` à la clause `where` **seulement** quand l'acteur ne peut pas
  voir les brouillons (mêmes conditions que le filtre `statut` actuel).
- `findAll`, `findOne`, `findBySlug` passent `query?.platform` (ou `undefined`, qui vaut `'WEB'`
  dans `visibilityFilter`) à `visibilityFilter`. `findAllAdmin` continue d'appeler `findAll` sans
  changement de signature ; le filtre `scope` exact de `ActualitesSearchDto`, lui, est appliqué en
  plus dans le corps de `findAll` (comme `categorie`/`tags` aujourd'hui), sans conditionner sur
  l'acteur.

### Contrôleur (`actualites.controller.ts`)

- `GET /actualites`, `GET /actualites/:id`, `GET /actualites/slug/:slug` : lisent `platform` depuis
  la query (déjà porté par `ActualitesSearchDto` pour `findAll` ; pour `findOne`/`findBySlug`, un
  `@Query('platform') platform?: 'WEB' | 'MOBILE'` simple suffit, validé par le même
  `@IsIn` via un petit DTO partagé plutôt qu'une validation manuelle dans le contrôleur).

## Tests

- `actualites.service.spec.ts` : scope par défaut `WEB` à la création sans `scope` fourni ; une
  actualité `MOBILE` publiée n'apparaît pas dans `findAll` sans `platform` (donc `platform=WEB`
  implicite) ni dans `findOne`/`findBySlug` pour un acteur non éditorial ; apparaît avec
  `platform=MOBILE` ; un éditeur voit tout indépendamment de `platform`.
- Vérification manuelle : créer une actualité `scope=MOBILE`, la publier, confirmer qu'elle
  n'apparaît pas sur `GET /actualites` (sans `platform`) mais apparaît avec
  `GET /actualites?platform=MOBILE`.
