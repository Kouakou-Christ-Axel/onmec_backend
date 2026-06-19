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
  @ApiOperation({ summary: 'Liste des quiz', description: 'Retourne les quiz avec pagination et filtres optionnels par catégorie, difficulté ou recherche.' })
  @ApiOkResponse({
    description: 'Liste paginée des quiz',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginatedResponseDto' },
        { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/QuizzResponseDto' } } } },
      ],
    },
  })
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
