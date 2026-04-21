# Amélioration de la documentation Swagger — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Documenter complètement l'API OnMec avec Swagger : tags, opérations, réponses typées, paramètres, authentification — sur tous les controllers.

**Architecture:** Approche B — créer des DTOs de réponse typés avec `@ApiProperty`, enrichir les DTOs d'entrée existants, puis ajouter les décorateurs Swagger complets sur chaque controller. Aucun comportement métier modifié.

**Tech Stack:** NestJS, `@nestjs/swagger`, class-validator, Prisma (PostgreSQL)

---

## Fichiers créés / modifiés

| Action | Fichier |
|---|---|
| Modifier | `src/main.ts` |
| Créer | `src/common/dto/paginated-response.dto.ts` |
| Modifier | `src/modules/quizz/dto/create-quizz.dto.ts` |
| Modifier | `src/modules/quizz/dto/submit-answer.dto.ts` |
| Modifier | `src/modules/quizz/dto/search-quizz.dto.ts` |
| Modifier | `src/modules/quizz/dto/create-categorie-quiz.dto.ts` |
| Créer | `src/modules/quizz/dto/quizz-response.dto.ts` |
| Créer | `src/modules/actualites/dto/actualite-response.dto.ts` |
| Créer | `src/modules/users/dto/user-response.dto.ts` |
| Modifier | `src/modules/auth/controllers/auth.controller.ts` |
| Modifier | `src/modules/users/controller/users.controller.ts` |
| Modifier | `src/modules/quizz/quizz.controller.ts` |
| Modifier | `src/modules/actualites/actualites.controller.ts` |
| Modifier | `src/modules/librairie/librairie.controller.ts` |

---

### Task 1: Améliorer la configuration Swagger globale (`main.ts`)

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Remplacer la config DocumentBuilder**

Dans `src/main.ts`, remplacer le bloc `DocumentBuilder` existant (lignes 73–80) par :

```typescript
const config = new DocumentBuilder()
  .setTitle('OnMec API')
  .setDescription(
    "API officielle de la plateforme OnMec — application citoyenne de la Côte d'Ivoire. " +
    'Permet la gestion des actualités, signalements citoyens, bibliothèque de documents et quiz éducatifs.',
  )
  .setVersion('1.0')
  .setContact('Équipe OnMec', 'https://mec-ci.org', 'contact@mec-ci.org')
  .addBearerAuth(
    { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
    'JWT',
  )
  .addTag('Auth', "Authentification et gestion des tokens JWT")
  .addTag('Utilisateurs', "Gestion des comptes utilisateurs et membres")
  .addTag('Actualités', "Publication et consultation des actualités")
  .addTag('Signalement Citoyen', "Signalements de problèmes urbains par les citoyens")
  .addTag('Librairie', "Bibliothèque de documents téléchargeables")
  .addTag('Quizz', "Quiz éducatifs et résultats")
  .addServer('https://api.mec-ci.org', 'Production')
  .addServer('http://localhost:8081', 'Local')
  .build();
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

```bash
rtk tsc
```

Attendu : aucune erreur

- [ ] **Step 3: Commit**

```bash
rtk git add src/main.ts && rtk git commit -m "docs(swagger): améliorer la configuration globale Swagger"
```

---

### Task 2: Créer `PaginatedResponseDto` générique

**Files:**
- Create: `src/common/dto/paginated-response.dto.ts`

- [ ] **Step 1: Créer le fichier**

```typescript
// src/common/dto/paginated-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class PaginatedMetaDto {
  @ApiProperty({ description: 'Nombre total d\'éléments', example: 100 })
  total: number;

  @ApiProperty({ description: 'Page courante', example: 1 })
  page: number;

  @ApiProperty({ description: 'Nombre d\'éléments par page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Nombre total de pages', example: 10 })
  totalPages: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({ type: () => PaginatedMetaDto })
  meta: PaginatedMetaDto;
}
```

- [ ] **Step 2: Vérifier la compilation**

```bash
rtk tsc
```

Attendu : aucune erreur

- [ ] **Step 3: Commit**

```bash
rtk git add src/common/dto/paginated-response.dto.ts && rtk git commit -m "feat(swagger): ajouter PaginatedResponseDto générique"
```

---

### Task 3: Enrichir les DTOs d'entrée Quizz avec `@ApiProperty`

**Files:**
- Modify: `src/modules/quizz/dto/create-quizz.dto.ts`
- Modify: `src/modules/quizz/dto/submit-answer.dto.ts`
- Modify: `src/modules/quizz/dto/search-quizz.dto.ts`
- Modify: `src/modules/quizz/dto/create-categorie-quiz.dto.ts`

- [ ] **Step 1: Réécrire `create-quizz.dto.ts`**

```typescript
// src/modules/quizz/dto/create-quizz.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { QuizDifficulte } from '@prisma/client';

export class CreateChoiceDto {
  @ApiProperty({ description: 'Texte du choix', example: 'Abidjan' })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Indique si ce choix est la bonne réponse', example: true })
  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({ description: 'Texte de la question', example: 'Quelle est la capitale économique de la Côte d\'Ivoire ?' })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Liste des choix possibles', type: [CreateChoiceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChoiceDto)
  choices: CreateChoiceDto[];
}

export class CreateQuizzDto {
  @ApiProperty({ description: 'Titre du quiz', example: 'Géographie de Côte d\'Ivoire' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Description du quiz', example: 'Testez vos connaissances sur la géographie ivoirienne.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Niveau de difficulté', enum: QuizDifficulte, example: QuizDifficulte.MOYEN })
  @IsOptional()
  @IsEnum(QuizDifficulte)
  difficulte?: QuizDifficulte;

  @ApiPropertyOptional({ description: 'Identifiant de la catégorie', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsString()
  categorieId?: string;

  @ApiProperty({ description: 'Liste des questions du quiz', type: [CreateQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}
```

- [ ] **Step 2: Réécrire `submit-answer.dto.ts`**

```typescript
// src/modules/quizz/dto/submit-answer.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @ApiProperty({ description: 'Identifiant de la question', example: 'q1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  questionId: string;

  @ApiProperty({ description: 'Identifiant du choix sélectionné', example: 'c1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  choiceId: string;
}

export class SubmitAnswerDto {
  @ApiProperty({ description: 'Identifiant de l\'utilisateur', example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Identifiant du quiz', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  quizId: string;

  @ApiProperty({ description: 'Liste des réponses soumises', type: [AnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
```

- [ ] **Step 3: Réécrire `search-quizz.dto.ts`**

```typescript
// src/modules/quizz/dto/search-quizz.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { QuizDifficulte } from '@prisma/client';

export class SearchQuizzDto {
  @ApiPropertyOptional({ description: 'Filtrer par catégorie', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsString()
  categorieId?: string;

  @ApiPropertyOptional({ description: 'Filtrer par difficulté', enum: QuizDifficulte, example: QuizDifficulte.FACILE })
  @IsOptional()
  @IsEnum(QuizDifficulte)
  difficulte?: QuizDifficulte;
}
```

- [ ] **Step 4: Réécrire `create-categorie-quiz.dto.ts`**

```typescript
// src/modules/quizz/dto/create-categorie-quiz.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateCategorieQuizDto {
  @ApiProperty({ description: 'Nom de la catégorie', example: 'Géographie' })
  @IsString()
  nom: string;

  @ApiPropertyOptional({ description: 'Description de la catégorie', example: 'Quiz sur la géographie africaine' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCategorieQuizDto extends PartialType(CreateCategorieQuizDto) {}
```

- [ ] **Step 5: Vérifier la compilation**

```bash
rtk tsc
```

Attendu : aucune erreur

- [ ] **Step 6: Commit**

```bash
rtk git add src/modules/quizz/dto/ && rtk git commit -m "docs(swagger): ajouter @ApiProperty sur les DTOs d'entrée Quizz"
```

---

### Task 4: Créer les DTOs de réponse Quizz

**Files:**
- Create: `src/modules/quizz/dto/quizz-response.dto.ts`

- [ ] **Step 1: Créer le fichier**

```typescript
// src/modules/quizz/dto/quizz-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizDifficulte } from '@prisma/client';

export class ChoiceResponseDto {
  @ApiProperty({ example: 'c1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Abidjan' })
  text: string;
}

export class QuestionResponseDto {
  @ApiProperty({ example: 'q1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Quelle est la capitale économique de la Côte d\'Ivoire ?' })
  text: string;

  @ApiProperty({ type: [ChoiceResponseDto] })
  choices: ChoiceResponseDto[];
}

export class CategorieQuizResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Géographie' })
  nom: string;

  @ApiPropertyOptional({ example: 'Quiz sur la géographie africaine' })
  description?: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class QuizAuthorDto {
  @ApiProperty({ example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Jean Dupont' })
  fullname: string;

  @ApiProperty({ example: 'jean.dupont@example.com' })
  email: string;
}

export class QuizzResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Géographie de Côte d\'Ivoire' })
  title: string;

  @ApiPropertyOptional({ example: 'Testez vos connaissances sur la géographie ivoirienne.' })
  description?: string | null;

  @ApiPropertyOptional({ enum: QuizDifficulte, example: QuizDifficulte.MOYEN })
  difficulte?: QuizDifficulte | null;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  categorieId?: string | null;

  @ApiPropertyOptional({ type: () => CategorieQuizResponseDto })
  categorie?: CategorieQuizResponseDto | null;

  @ApiProperty({ type: () => QuizAuthorDto })
  author: QuizAuthorDto;

  @ApiProperty({ type: [QuestionResponseDto] })
  questions: QuestionResponseDto[];

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class QuizResultResponseDto {
  @ApiProperty({ example: 'r1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  quizId: string;

  @ApiProperty({ description: 'Score en pourcentage', example: 80 })
  score: number;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  completedAt?: Date | null;
}

export class QuizStatisticsResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  quizId: string;

  @ApiProperty({ example: 'Géographie de Côte d\'Ivoire' })
  title: string;

  @ApiProperty({ example: 10 })
  totalQuestions: number;

  @ApiProperty({ example: 42 })
  totalAttempts: number;

  @ApiProperty({ description: 'Score moyen en pourcentage', example: 67 })
  averageScore: number;

  @ApiProperty({ description: 'Les 10 dernières tentatives', isArray: true })
  recentAttempts: object[];
}

export class SubmitAnswerResponseDto {
  @ApiProperty({ example: 80 })
  score: number;

  @ApiProperty({ example: 8 })
  correctCount: number;

  @ApiProperty({ example: 10 })
  totalQuestions: number;

  @ApiProperty({ example: 80 })
  percentage: number;
}
```

- [ ] **Step 2: Vérifier la compilation**

```bash
rtk tsc
```

Attendu : aucune erreur

- [ ] **Step 3: Commit**

```bash
rtk git add src/modules/quizz/dto/quizz-response.dto.ts && rtk git commit -m "feat(swagger): créer les DTOs de réponse pour le module Quizz"
```

---

### Task 5: Créer `ActualiteResponseDto`

**Files:**
- Create: `src/modules/actualites/dto/actualite-response.dto.ts`

- [ ] **Step 1: Créer le fichier**

```typescript
// src/modules/actualites/dto/actualite-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActualiteResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'inauguration-du-nouveau-pont' })
  slug: string;

  @ApiProperty({ example: 'Inauguration du nouveau pont d\'Abidjan' })
  title: string;

  @ApiProperty({ example: 'Le nouveau pont a été officiellement inauguré ce matin.' })
  excerpt: string;

  @ApiProperty({ example: '<p>Le nouveau pont reliant le plateau à Treichville...</p>' })
  content: string;

  @ApiProperty({ example: '2026-04-21T08:00:00.000Z' })
  date: Date;

  @ApiPropertyOptional({ example: '/uploads/actualites/pont-abidjan.jpg' })
  imageUrl?: string | null;

  @ApiProperty({ example: '2026-04-21T09:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-21T09:00:00.000Z' })
  updatedAt: Date;
}
```

- [ ] **Step 2: Vérifier la compilation**

```bash
rtk tsc
```

Attendu : aucune erreur

- [ ] **Step 3: Commit**

```bash
rtk git add src/modules/actualites/dto/actualite-response.dto.ts && rtk git commit -m "feat(swagger): créer ActualiteResponseDto"
```

---

### Task 6: Créer `UserResponseDto`

**Files:**
- Create: `src/modules/users/dto/user-response.dto.ts`

- [ ] **Step 1: Créer le fichier**

```typescript
// src/modules/users/dto/user-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Jean Dupont' })
  fullname: string;

  @ApiProperty({ example: 'jean.dupont@mec-ci.org' })
  email: string;

  @ApiPropertyOptional({ example: '+2250707070707' })
  phone?: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.MEMBER })
  role: UserRole;

  @ApiPropertyOptional({ example: '/uploads/users-avatar/u1b2c3d4.jpg' })
  image?: string | null;

  @ApiPropertyOptional({ example: 'Cocody, Abidjan' })
  address?: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: null })
  deletedAt?: Date | null;
}
```

- [ ] **Step 2: Vérifier la compilation**

```bash
rtk tsc
```

Attendu : aucune erreur

- [ ] **Step 3: Commit**

```bash
rtk git add src/modules/users/dto/user-response.dto.ts && rtk git commit -m "feat(swagger): créer UserResponseDto"
```

---

### Task 7: Documenter `AuthController`

**Files:**
- Modify: `src/modules/auth/controllers/auth.controller.ts`

- [ ] **Step 1: Réécrire le controller**

```typescript
// src/modules/auth/controllers/auth.controller.ts
import { Body, Controller, Get, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { LoginUserDto } from 'src/modules/auth/dto/login-user.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtRefreshAuthGuard } from '../guards/jwt-refresh-auth.guard';
import { RegisterUserDto } from '../dto/register-user.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Connexion utilisateur', description: 'Authentifie un utilisateur et retourne un JWT et un refresh token.' })
  @ApiBody({ type: LoginUserDto })
  @ApiOkResponse({ description: 'Connexion réussie — retourne user, token et refreshToken' })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Mot de passe incorrect' })
  async login(@Body() data: LoginUserDto) {
    return this.authService.login(data);
  }

  @Get('refresh-token')
  @UseGuards(JwtRefreshAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Rafraîchissement du token', description: 'Génère un nouveau JWT à partir du refresh token fourni dans le header Authorization.' })
  @ApiOkResponse({ description: 'Nouveau JWT retourné' })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalide ou expiré' })
  async refreshToken(@Req() req: Request) {
    return this.authService.refreshToken(req);
  }

  @Post('register')
  @ApiOperation({ summary: 'Création de compte', description: 'Crée un nouveau compte utilisateur.' })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Compte créé avec succès' })
  @ApiConflictResponse({ description: 'Un compte avec cet email existe déjà' })
  async register(@Body() data: RegisterUserDto) {
    return this.authService.register(data);
  }
}
```

- [ ] **Step 2: Vérifier la compilation**

```bash
rtk tsc
```

Attendu : aucune erreur

- [ ] **Step 3: Commit**

```bash
rtk git add src/modules/auth/controllers/auth.controller.ts && rtk git commit -m "docs(swagger): documenter AuthController"
```

---

### Task 8: Documenter `UsersController`

**Files:**
- Modify: `src/modules/users/controller/users.controller.ts`

- [ ] **Step 1: Ajouter les imports Swagger manquants et les décorateurs au controller**

Remplacer le bloc d'imports Swagger et l'en-tête du controller existants :

```typescript
import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { UserRoles } from 'src/common/decorators/user-roles.decorator';
import { UserRolesGuard } from 'src/common/guards/user-roles.guard';
import { GenerateConfigService } from 'src/common/services/generate-config.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';
import { UpdateUserPasswordDto } from 'src/modules/users/dto/update-user-password.dto';
import { UpdateUserDto } from 'src/modules/users/dto/update-user.dto';
import { UsersService } from 'src/modules/users/services/users.service';
import { ResetUserPasswordResponseDto } from '../dto/reset-user-password.dto';
import { UserResponseDto } from '../dto/user-response.dto';

@ApiTags('Utilisateurs')
@ApiBearerAuth('JWT')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }
```

- [ ] **Step 2: Documenter `POST /` (create)**

Remplacer les décorateurs de la méthode `create` :

```typescript
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', { ...GenerateConfigService.generateConfigSingleImageUpload('./uploads/users-avatar') }))
  @ApiOperation({ summary: 'Créer un utilisateur (Admin)', description: 'Crée un nouveau compte utilisateur avec avatar optionnel. Nécessite d\'être authentifié.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ description: 'Utilisateur créé avec succès', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Email déjà utilisé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  async create(@Req() req: Request, @Body() createUserDto: CreateUserDto, @UploadedFile() image: Express.Multer.File) {
```

- [ ] **Step 3: Documenter `POST /member` (createMember)**

Remplacer les décorateurs de `createMember` :

```typescript
  @Post('member')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', { ...GenerateConfigService.generateConfigSingleImageUpload('./uploads/users-avatar') }))
  @ApiOperation({ summary: 'Créer un membre', description: 'Crée un nouveau compte membre avec avatar optionnel.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ description: 'Membre créé avec succès', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Email déjà utilisé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  async createMember(@Req() req: Request, @Body() createUserDto: CreateUserDto, @UploadedFile() image: Express.Multer.File) {
```

- [ ] **Step 4: Documenter `GET /detail`, `GET /`**

```typescript
  @Get('detail')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mon profil', description: 'Retourne le profil de l\'utilisateur authentifié.' })
  @ApiOkResponse({ description: 'Profil récupéré', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  detail(@Req() req: Request) {
    return this.usersService.detail(req);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Liste des utilisateurs', description: 'Retourne tous les utilisateurs (admin requis implicitement).' })
  @ApiOkResponse({ description: 'Liste récupérée', type: [UserResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  findAll() {
    return this.usersService.findAll();
  }
```

- [ ] **Step 5: Documenter `PATCH /`, `PATCH /password`, `PATCH /:id/reset-password`**

```typescript
  @Patch()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', { ...GenerateConfigService.generateConfigSingleImageUpload('./uploads/users-avatar') }))
  @ApiOperation({ summary: 'Mettre à jour mon profil' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ description: 'Profil mis à jour', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Données invalides' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  async update(@Req() req: Request, @Body() updateUserDto: UpdateUserDto, @UploadedFile() image: Express.Multer.File) {

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Changer mon mot de passe' })
  @ApiBody({ type: UpdateUserPasswordDto })
  @ApiOkResponse({ description: 'Mot de passe mis à jour' })
  @ApiBadRequestResponse({ description: 'Mot de passe actuel incorrect' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  async updatePassword(@Req() req: Request, @Body() updateUserPasswordDto: UpdateUserPasswordDto) {

  @Patch(':id/reset-password')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @UserRoles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe (Admin)', description: 'Génère un nouveau mot de passe temporaire pour l\'utilisateur spécifié.' })
  @ApiParam({ name: 'id', description: 'Identifiant de l\'utilisateur', example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Nouveau mot de passe généré', type: ResetUserPasswordResponseDto })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Réservé aux administrateurs' })
  async resetPassword(@Req() req: Request, @Param('id') user_id: string) {
```

- [ ] **Step 6: Documenter `DELETE /`, `POST /restore/:id`, `DELETE /delete/:id`**

```typescript
  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Désactiver mon compte', description: 'Soft delete du compte de l\'utilisateur authentifié.' })
  @ApiOkResponse({ description: 'Compte désactivé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  async partialDelete(@Req() req: Request) {

  @Post('restore/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Restaurer un compte', description: 'Réactive un compte préalablement désactivé.' })
  @ApiParam({ name: 'id', description: 'Identifiant de l\'utilisateur', example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Compte restauré', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  async restore(@Req() req: Request, @Param('id') id: string) {

  @Delete('/delete/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Supprimer définitivement (Admin)', description: 'Suppression permanente et irréversible du compte.' })
  @ApiParam({ name: 'id', description: 'Identifiant de l\'utilisateur', example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Compte supprimé définitivement' })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  async delete(@Req() req: Request, @Param('id') id: string) {
```

- [ ] **Step 7: Vérifier la compilation**

```bash
rtk tsc
```

Attendu : aucune erreur

- [ ] **Step 8: Commit**

```bash
rtk git add src/modules/users/controller/users.controller.ts && rtk git commit -m "docs(swagger): documenter UsersController"
```

---

### Task 9: Documenter `QuizzController` (de zéro)

**Files:**
- Modify: `src/modules/quizz/quizz.controller.ts`

- [ ] **Step 1: Réécrire le controller complet**

```typescript
// src/modules/quizz/quizz.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { Request } from 'express';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuizzService } from './quizz.service';
import { CreateCategorieQuizDto, UpdateCategorieQuizDto } from './dto/create-categorie-quiz.dto';
import { CreateQuizzDto } from './dto/create-quizz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { SearchQuizzDto } from './dto/search-quizz.dto';
import {
  CategorieQuizResponseDto,
  QuizzResponseDto,
  QuizResultResponseDto,
  QuizStatisticsResponseDto,
  SubmitAnswerResponseDto,
} from './dto/quizz-response.dto';

@ApiTags('Quizz')
@ApiBearerAuth('JWT')
@Controller('quizz')
export class QuizzController {
  constructor(private readonly quizService: QuizzService) {}

  // ─── Quiz ──────────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un quiz', description: 'Crée un quiz avec ses questions et choix. L\'utilisateur authentifié devient l\'auteur.' })
  @ApiBody({ type: CreateQuizzDto })
  @ApiCreatedResponse({ description: 'Quiz créé avec succès', type: QuizzResponseDto })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  create(@Req() req: Request, @Body() createQuizzDto: CreateQuizzDto) {
    const user = req.user as User;
    return this.quizService.create(createQuizzDto, user.id);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Soumettre les réponses', description: 'Enregistre les réponses d\'un utilisateur pour un quiz et calcule son score.' })
  @ApiBody({ type: SubmitAnswerDto })
  @ApiOkResponse({ description: 'Réponses enregistrées, score calculé', type: SubmitAnswerResponseDto })
  @ApiNotFoundResponse({ description: 'Quiz non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  submitAnswers(@Body() submitAnswerDto: SubmitAnswerDto) {
    return this.quizService.submitAnswers(submitAnswerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des quiz', description: 'Retourne tous les quiz, avec filtres optionnels par catégorie ou difficulté.' })
  @ApiOkResponse({ description: 'Liste des quiz', type: [QuizzResponseDto] })
  findAll(@Query() query: SearchQuizzDto) {
    return this.quizService.findAll(query);
  }

  // ─── Catégories ────────────────────────────────────────────────────────────

  @Post('categories')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une catégorie (Admin)', description: 'Crée une nouvelle catégorie de quiz. Réservé aux administrateurs.' })
  @ApiBody({ type: CreateCategorieQuizDto })
  @ApiCreatedResponse({ description: 'Catégorie créée', type: CategorieQuizResponseDto })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Accès réservé aux administrateurs' })
  createCategorie(@Body() dto: CreateCategorieQuizDto) {
    return this.quizService.createCategorie(dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Liste des catégories', description: 'Retourne toutes les catégories de quiz disponibles.' })
  @ApiOkResponse({ description: 'Liste des catégories', type: [CategorieQuizResponseDto] })
  findAllCategories() {
    return this.quizService.findAllCategories();
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Détail d\'une catégorie' })
  @ApiParam({ name: 'id', description: 'Identifiant de la catégorie', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Catégorie trouvée', type: CategorieQuizResponseDto })
  @ApiNotFoundResponse({ description: 'Catégorie non trouvée' })
  findOneCategorie(@Param('id') id: string) {
    return this.quizService.findOneCategorie(id);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Modifier une catégorie (Admin)' })
  @ApiParam({ name: 'id', description: 'Identifiant de la catégorie', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiBody({ type: UpdateCategorieQuizDto })
  @ApiOkResponse({ description: 'Catégorie mise à jour', type: CategorieQuizResponseDto })
  @ApiNotFoundResponse({ description: 'Catégorie non trouvée' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Accès réservé aux administrateurs' })
  updateCategorie(@Param('id') id: string, @Body() dto: UpdateCategorieQuizDto) {
    return this.quizService.updateCategorie(id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer une catégorie (Admin)' })
  @ApiParam({ name: 'id', description: 'Identifiant de la catégorie', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Catégorie supprimée' })
  @ApiNotFoundResponse({ description: 'Catégorie non trouvée' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Accès réservé aux administrateurs' })
  removeCategorie(@Param('id') id: string) {
    return this.quizService.removeCategorie(id);
  }

  // ─── Quiz par ID ───────────────────────────────────────────────────────────

  @Get('results/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Résultats d\'un utilisateur', description: 'Retourne l\'historique de tous les quiz complétés par un utilisateur.' })
  @ApiParam({ name: 'userId', description: 'Identifiant de l\'utilisateur', example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Résultats récupérés', type: [QuizResultResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  getUserResults(@Param('userId') userId: string) {
    return this.quizService.getUserResults(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un quiz' })
  @ApiParam({ name: 'id', description: 'Identifiant du quiz', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Quiz trouvé', type: QuizzResponseDto })
  @ApiNotFoundResponse({ description: 'Quiz non trouvé' })
  findOne(@Param('id') id: string) {
    return this.quizService.findOne(id);
  }

  @Get(':id/statistics')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Statistiques d\'un quiz', description: 'Retourne les statistiques globales d\'un quiz (tentatives, score moyen, etc.).' })
  @ApiParam({ name: 'id', description: 'Identifiant du quiz', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Statistiques récupérées', type: QuizStatisticsResponseDto })
  @ApiNotFoundResponse({ description: 'Quiz non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  getQuizStatistics(@Param('id') id: string) {
    return this.quizService.getQuizStatistics(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer un quiz', description: 'Supprime un quiz et toutes ses questions associées.' })
  @ApiParam({ name: 'id', description: 'Identifiant du quiz', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Quiz supprimé' })
  @ApiNotFoundResponse({ description: 'Quiz non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  remove(@Param('id') id: string) {
    return this.quizService.remove(id);
  }
}
```

- [ ] **Step 2: Vérifier la compilation**

```bash
rtk tsc
```

Attendu : aucune erreur

- [ ] **Step 3: Commit**

```bash
rtk git add src/modules/quizz/quizz.controller.ts && rtk git commit -m "docs(swagger): documenter complètement QuizzController"
```

---

### Task 10: Documenter `ActualitesController`

**Files:**
- Modify: `src/modules/actualites/actualites.controller.ts`

- [ ] **Step 1: Réécrire le controller**

```typescript
// src/modules/actualites/actualites.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { ActualitesService } from './actualites.service';
import { CreateActualiteDto } from './dto/create-actualite.dto';
import { UpdateActualiteDto } from './dto/update-actualite.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { GenerateConfigService } from '../../common/services/generate-config.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActualitesSearchDto } from './dto/actualites-search.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActualiteResponseDto } from './dto/actualite-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@ApiTags('Actualités')
@Controller('actualites')
export class ActualitesController {
  constructor(private readonly actualitesService: ActualitesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Créer une actualité', description: 'Publie une nouvelle actualité avec image optionnelle.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateActualiteDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Actualité créée', type: ActualiteResponseDto })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  @UseInterceptors(
    FileInterceptor(
      'image',
      GenerateConfigService.generateConfigSingleImageUpload('./uploads/actualites')
    )
  )
  create(
    @Body() createActualiteDto: CreateActualiteDto,
    @UploadedFile() image?: Express.Multer.File
  ) {
    return this.actualitesService.create(createActualiteDto, image);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des actualités', description: 'Retourne les actualités avec pagination et filtres optionnels.' })
  @ApiOkResponse({
    description: 'Liste paginée des actualités',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginatedResponseDto' },
        { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/ActualiteResponseDto' } } } },
      ],
    },
  })
  findAll(@Query() query: ActualitesSearchDto) {
    return this.actualitesService.findAll(query);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Trouver par slug' })
  @ApiParam({ name: 'slug', description: 'Slug unique de l\'actualité', example: 'inauguration-du-nouveau-pont' })
  @ApiOkResponse({ description: 'Actualité trouvée', type: ActualiteResponseDto })
  @ApiNotFoundResponse({ description: 'Actualité non trouvée' })
  findBySlug(@Param('slug') slug: string) {
    return this.actualitesService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Trouver par ID' })
  @ApiParam({ name: 'id', description: 'Identifiant de l\'actualité', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Actualité trouvée', type: ActualiteResponseDto })
  @ApiNotFoundResponse({ description: 'Actualité non trouvée' })
  findOne(@Param('id') id: string) {
    return this.actualitesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Modifier une actualité' })
  @ApiParam({ name: 'id', description: 'Identifiant de l\'actualité', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateActualiteDto })
  @ApiOkResponse({ description: 'Actualité mise à jour', type: ActualiteResponseDto })
  @ApiNotFoundResponse({ description: 'Actualité non trouvée' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  @UseInterceptors(
    FileInterceptor(
      'image',
      GenerateConfigService.generateConfigSingleImageUpload('./uploads/actualites')
    )
  )
  update(
    @Param('id') id: string,
    @Body() updateActualiteDto: UpdateActualiteDto,
    @UploadedFile() image?: Express.Multer.File
  ) {
    return this.actualitesService.update(id, updateActualiteDto, image);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Supprimer une actualité' })
  @ApiParam({ name: 'id', description: 'Identifiant de l\'actualité', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Actualité supprimée' })
  @ApiNotFoundResponse({ description: 'Actualité non trouvée' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  remove(@Param('id') id: string) {
    return this.actualitesService.remove(id);
  }
}
```

- [ ] **Step 2: Vérifier la compilation**

```bash
rtk tsc
```

Attendu : aucune erreur

- [ ] **Step 3: Commit**

```bash
rtk git add src/modules/actualites/actualites.controller.ts src/modules/actualites/dto/actualite-response.dto.ts && rtk git commit -m "docs(swagger): documenter ActualitesController"
```

---

### Task 11: Documenter `LibrairieController`

**Files:**
- Modify: `src/modules/librairie/librairie.controller.ts`

- [ ] **Step 1: Réécrire le controller**

```typescript
// src/modules/librairie/librairie.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LibrairieService } from './librairie.service';
import { CreateDocumentDto, DocumentFilesDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { User } from '@prisma/client';
import { SearchDocumentDto } from './dto/search-document.dto';
import { UploadValidationPipe } from '../image-processing/upload-validation/upload-validation.pipe';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@ApiTags('Librairie')
@ApiBearerAuth('JWT')
@Controller('librairie')
export class LibrairieController {
  constructor(private readonly librairieService: LibrairieService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Uploader un document', description: 'Crée une nouvelle entrée de document avec fichier et couverture optionnelle.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateDocumentDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Document créé avec succès', type: DocumentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'covers', maxCount: 1 },
      { name: 'fichiers', maxCount: 1 },
    ], {
      dest: './uploads/tmp/librairie',
    }),
  )
  create(
    @Req() req: Request,
    @Body() createLibrairieDto: CreateDocumentDto,
    @UploadedFiles(new UploadValidationPipe())
    files: DocumentFilesDto,
  ) {
    const user = req.user as User;
    createLibrairieDto.userId = user.id;
    return this.librairieService.create(createLibrairieDto, files);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des documents', description: 'Retourne les documents paginés avec filtres optionnels.' })
  @ApiOkResponse({
    description: 'Liste paginée de documents',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginatedResponseDto' },
        { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/DocumentResponseDto' } } } },
      ],
    },
  })
  findAll(@Query() searchParams: SearchDocumentDto) {
    return this.librairieService.findAll(searchParams);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un document' })
  @ApiParam({ name: 'id', description: 'Identifiant du document', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({ description: 'Document trouvé', type: DocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Document non trouvé' })
  findOne(@Param('id') id: string) {
    return this.librairieService.findOne(id);
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Télécharger le fichier', description: 'Retourne l\'URL de téléchargement du fichier associé au document.' })
  @ApiParam({ name: 'id', description: 'Identifiant du document', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({ description: 'URL du fichier retournée' })
  @ApiNotFoundResponse({ description: 'Document non trouvé' })
  async getFile(@Param('id') id: string) {
    return await this.librairieService.getFile(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un document' })
  @ApiParam({ name: 'id', description: 'Identifiant du document', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiBody({ type: UpdateDocumentDto })
  @ApiOkResponse({ description: 'Document mis à jour', type: DocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Document non trouvé' })
  update(
    @Param('id') id: string,
    @Body() updateLibrairieDto: UpdateDocumentDto,
  ) {
    return this.librairieService.update(id, updateLibrairieDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un document' })
  @ApiParam({ name: 'id', description: 'Identifiant du document', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({ description: 'Document supprimé' })
  @ApiNotFoundResponse({ description: 'Document non trouvé' })
  remove(@Param('id') id: string) {
    return this.librairieService.remove(id);
  }
}
```

- [ ] **Step 2: Vérifier la compilation**

```bash
rtk tsc
```

Attendu : aucune erreur

- [ ] **Step 3: Commit final**

```bash
rtk git add src/modules/librairie/librairie.controller.ts && rtk git commit -m "docs(swagger): documenter LibrairieController"
```

---

## Self-Review

### Couverture du spec
- ✅ `main.ts` amélioré (Task 1)
- ✅ `PaginatedResponseDto` générique (Task 2)
- ✅ DTOs d'entrée Quizz annotés (Task 3)
- ✅ DTOs de réponse Quizz (Task 4)
- ✅ `ActualiteResponseDto` (Task 5)
- ✅ `UserResponseDto` (Task 6)
- ✅ `AuthController` documenté (Task 7)
- ✅ `UsersController` documenté (Task 8)
- ✅ `QuizzController` documenté (Task 9)
- ✅ `ActualitesController` documenté (Task 10)
- ✅ `LibrairieController` documenté (Task 11)

### Cohérence des types
- `@ApiBearerAuth('JWT')` utilisé partout de façon cohérente (correspond au nom déclaré dans `main.ts`)
- `PaginatedResponseDto` importé depuis `../../common/dto/paginated-response.dto`
- `ActualiteResponseDto` importé depuis `./dto/actualite-response.dto`
- `UserResponseDto` importé depuis `../dto/user-response.dto`
- `QuizzResponseDto`, `CategorieQuizResponseDto`, etc. importés depuis `./dto/quizz-response.dto`
- `CreateChoiceDto`, `CreateQuestionDto` exportés dans `create-quizz.dto.ts` (utilisés nulle part ailleurs, OK)
