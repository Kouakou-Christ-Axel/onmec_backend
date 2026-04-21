# Amélioration de la documentation Swagger — OnMec Backend

**Date :** 2026-04-21  
**Statut :** Approuvé

---

## Contexte

L'API OnMec expose 6 modules (Auth, Users, Quizz, Actualités, Librairie, Signalement Citoyen) via NestJS. La documentation Swagger est incomplète et incohérente : certains controllers n'ont aucun décorateur Swagger, les DTOs d'entrée manquent d'`@ApiProperty`, et il n'existe pas de DTOs de réponse typés pour la plupart des modules.

**Objectif :** Produire une documentation Swagger complète, typée et cohérente sur l'ensemble de l'API.

---

## Architecture

L'approche retenue est **B — DTOs typés + décorateurs complets** :
1. Enrichir les DTOs d'entrée existants avec `@ApiProperty`
2. Créer des DTOs de réponse dédiés avec `@ApiProperty`
3. Documenter chaque controller avec les décorateurs Swagger appropriés
4. Améliorer la configuration globale dans `main.ts`

Aucun comportement métier n'est modifié — seule la couche de documentation est touchée.

---

## Composants

### 1. Configuration globale (`src/main.ts`)

- Remplacer la description générique `"The API description"` par une description métier réelle
- Ajouter les informations de contact et de licence
- Ajouter des tags globaux avec descriptions via `DocumentBuilder.addTag()`

### 2. DTOs d'entrée — ajout `@ApiProperty`

Les fichiers suivants sont enrichis avec des `@ApiProperty` sur chaque champ :

| Fichier | Classes concernées |
|---|---|
| `src/modules/quizz/dto/create-quizz.dto.ts` | `CreateQuizzDto`, `CreateQuestionDto`, `CreateChoiceDto` |
| `src/modules/quizz/dto/submit-answer.dto.ts` | `SubmitAnswerDto`, `AnswerDto` |
| `src/modules/quizz/dto/search-quizz.dto.ts` | `SearchQuizzDto` |
| `src/modules/quizz/dto/create-categorie-quiz.dto.ts` | `CreateCategorieQuizDto` |

Les DTOs déjà annotés (Auth, Users, Signalement, Actualités) sont vérifiés et complétés si nécessaire.

### 3. DTOs de réponse — nouveaux fichiers

#### `src/modules/quizz/dto/quizz-response.dto.ts`
- `ChoiceResponseDto` — id, text, isCorrect
- `QuestionResponseDto` — id, text, choices
- `CategorieQuizResponseDto` — id, nom, description, createdAt
- `QuizzResponseDto` — id, title, description, difficulte, categorieId, categorie, questions, createdAt, updatedAt
- `QuizResultResponseDto` — userId, quizId, score, totalQuestions, correctAnswers, createdAt
- `QuizStatisticsResponseDto` — quizId, totalAttempts, averageScore, passRate

#### `src/modules/actualites/dto/actualite-response.dto.ts`
- `ActualiteResponseDto` — id, slug, title, excerpt, content, date, imageUrl, createdAt, updatedAt

#### `src/modules/users/dto/user-response.dto.ts`
- `UserResponseDto` — id, fullname, email, phone, role, image, address, createdAt, updatedAt

#### `src/common/dto/paginated-response.dto.ts`
- `PaginatedMetaDto` — total, page, limit, totalPages
- `PaginatedResponseDto<T>` générique avec `data: T[]` et `meta: PaginatedMetaDto`

### 4. Documentation controllers

#### `src/modules/auth/controllers/auth.controller.ts`
- Ajouter `@ApiTags('Auth')`
- `POST /login` : `@ApiUnauthorizedResponse` en plus de la doc existante
- `GET /refresh-token` : `@ApiBearerAuth()`, `@ApiUnauthorizedResponse`
- `POST /register` : `@ApiConflictResponse` pour email déjà existant

#### `src/modules/users/controller/users.controller.ts`
- Ajouter `@ApiTags('Utilisateurs')`, `@ApiBearerAuth()` au niveau controller
- `POST /` et `POST /member` : `@ApiConsumes('multipart/form-data')`
- `GET /detail`, `DELETE /`, `PATCH /`, `PATCH /password` : `@ApiResponse` avec `UserResponseDto`
- `PATCH /:id/reset-password`, `DELETE /delete/:id`, `POST /restore/:id` : `@ApiParam({ name: 'id' })`

#### `src/modules/quizz/quizz.controller.ts`
Documentation complète de zéro :
- `@ApiTags('Quizz')` au niveau controller
- `@ApiBearerAuth()` au niveau controller
- Chaque endpoint : `@ApiOperation`, `@ApiResponse` avec les DTOs typés
- Endpoints avec params : `@ApiParam`
- Endpoints avec body : `@ApiBody`
- Routes admin : `@ApiResponse({ status: 403 })`

#### `src/modules/actualites/actualites.controller.ts`
- `@ApiBearerAuth()` sur les routes protégées (POST, PATCH, DELETE)
- `GET /slug/:slug` et `GET /:id` : `@ApiParam`, `@ApiResponse` avec `ActualiteResponseDto`
- `GET /` : schéma de réponse paginé avec `ActualiteResponseDto`
- Ajouter `@ApiResponse` HTTP 400, 404 aux endpoints manquants

#### `src/modules/librairie/librairie.controller.ts`
- Ajouter `@ApiTags('Librairie')`, `@ApiBearerAuth()`
- `POST /` : `@ApiOperation`, `@ApiConsumes('multipart/form-data')`, `@ApiBody`
- `GET /`, `GET /:id`, `GET /:id/file` : `@ApiOperation`, `@ApiParam`, `@ApiResponse`
- `PATCH /:id`, `DELETE /:id` : `@ApiOperation`, `@ApiParam`, `@ApiResponse`

---

## Flux de données

Aucun flux de données modifié. Les DTOs de réponse sont uniquement utilisés comme types de référence pour Swagger (annotations `type:` dans `@ApiResponse`). Ils ne remplacent pas la sérialisation existante.

---

## Gestion des erreurs

Chaque endpoint documente au minimum :
- **200/201** : succès avec type de retour
- **400** : données invalides (là où applicable)
- **401** : non authentifié (tous les endpoints avec `JwtAuthGuard`)
- **403** : accès refusé (endpoints avec `AdminGuard` ou `UserRolesGuard`)
- **404** : ressource non trouvée

---

## Tests

Aucun test à écrire pour cette feature (documentation pure). Vérification manuelle via l'UI Swagger (`/api/docs`) après implémentation.

---

## Fichiers créés

```
src/common/dto/paginated-response.dto.ts        (nouveau)
src/modules/quizz/dto/quizz-response.dto.ts     (nouveau)
src/modules/actualites/dto/actualite-response.dto.ts  (nouveau)
src/modules/users/dto/user-response.dto.ts      (nouveau)
```

## Fichiers modifiés

```
src/main.ts
src/modules/auth/controllers/auth.controller.ts
src/modules/users/controller/users.controller.ts
src/modules/quizz/quizz.controller.ts
src/modules/quizz/dto/create-quizz.dto.ts
src/modules/quizz/dto/submit-answer.dto.ts
src/modules/quizz/dto/search-quizz.dto.ts
src/modules/quizz/dto/create-categorie-quiz.dto.ts
src/modules/actualites/actualites.controller.ts
src/modules/librairie/librairie.controller.ts
```
