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
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedActor } from 'src/common/types/authenticated-actor';
import { ActualitesService } from './actualites.service';
import { CreateActualiteDto } from './dto/create-actualite.dto';
import { UpdateActualiteDto } from './dto/update-actualite.dto';
import {
  UploadImageRequestDto,
  UploadImageResponseDto,
} from './dto/upload-image.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
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
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminRolesGuard } from '../auth/guards/admin-roles.guard';
import { AdminRoles } from '../auth/decorators/admin-roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminRole } from '../../generated/prisma/client';
import { ActualiteResponseDto } from './dto/actualite-response.dto';

/** Rôles éditoriaux : rédaction et publication des actualités. */
const EDITORIAL = [AdminRole.ADMIN_NATIONAL, AdminRole.CHARGE_COMMUNICATION];

/**
 * Actualités.
 *
 * Les écritures étaient protégées par `JwtAuthGuard` seul : tout membre
 * connecté pouvait créer, modifier et supprimer définitivement n'importe quelle
 * actualité — et la suppression cascadait sur les likes et les commentaires.
 */
@ApiTags('Actualités')
@Controller('actualites')
export class ActualitesController {
  constructor(private readonly actualitesService: ActualitesService) {}

  // ── RÉDACTION ────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Créer une actualité',
    description:
      "Crée une actualité en BROUILLON. L'auteur est déduit du token, jamais du corps de requête. Publication par PATCH /actualites/:id/publier.",
  })
  @ApiBody({ type: CreateActualiteDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Actualité créée',
    type: ActualiteResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Rôle éditorial requis' })
  async create(
    @Body() createActualiteDto: CreateActualiteDto,
    @CurrentUser() actor: AuthenticatedActor,
  ) {
    return this.actualitesService.create(createActualiteDto, actor);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Modifier une actualité' })
  @ApiParam({ name: 'id', description: "Identifiant de l'actualité" })
  @ApiBody({ type: UpdateActualiteDto })
  @ApiOkResponse({ description: 'Actualité mise à jour', type: ActualiteResponseDto })
  @ApiNotFoundResponse({ description: 'Actualité non trouvée' })
  async update(
    @Param('id') id: string,
    @Body() updateActualiteDto: UpdateActualiteDto,
  ) {
    return this.actualitesService.update(id, updateActualiteDto);
  }

  @Post('upload-url')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: "Demander une URL présignée pour l'image de couverture",
    description:
      "Génère une clé d'objet sous `actualites/` (distincte du contenu, sous `actualites/contenu/`) et une URL PUT présignée. Le client envoie ensuite le fichier directement à R2, puis fournit la clé retournée en `imageKey` lors du POST/PATCH de l'actualité.",
  })
  @ApiBody({ type: UploadImageRequestDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'URL présignée générée',
    type: UploadImageResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Rôle éditorial requis' })
  async uploadUrl(@Body() dto: UploadImageRequestDto) {
    return this.actualitesService.buildCoverImageUrl(
      dto.filename,
      dto.contentType,
    );
  }

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: "Demander une URL présignée pour une image du corps d'un article",
    description:
      "Génère une clé d'objet dans un sous-dossier dédié au contenu (distinct de la couverture) et une URL PUT présignée. Le client envoie ensuite le fichier directement à R2, puis construit lui-même l'URL publique pour l'insérer dans le corps de l'article via l'éditeur.",
  })
  @ApiBody({ type: UploadImageRequestDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'URL présignée générée',
    type: UploadImageResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Rôle éditorial requis' })
  async uploadImage(@Body() dto: UploadImageRequestDto) {
    return this.actualitesService.buildContentImageUrl(
      dto.filename,
      dto.contentType,
    );
  }

  @Patch(':id/publier')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Publier une actualité',
    description: 'Rend l’actualité visible publiquement.',
  })
  @ApiParam({ name: 'id', description: "Identifiant de l'actualité" })
  @ApiOkResponse({ description: 'Actualité publiée', type: ActualiteResponseDto })
  @ApiNotFoundResponse({ description: 'Actualité non trouvée' })
  publier(@Param('id') id: string) {
    return this.actualitesService.publier(id);
  }

  @Patch(':id/depublier')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Dépublier une actualité',
    description: 'Repasse l’actualité en brouillon, sans perdre son contenu.',
  })
  @ApiParam({ name: 'id', description: "Identifiant de l'actualité" })
  @ApiOkResponse({ description: 'Actualité dépubliée', type: ActualiteResponseDto })
  depublier(@Param('id') id: string) {
    return this.actualitesService.depublier(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Supprimer une actualité',
    description:
      'Suppression réversible : les likes et commentaires sont conservés. Restauration via POST /actualites/:id/restore.',
  })
  @ApiParam({ name: 'id', description: "Identifiant de l'actualité" })
  @ApiOkResponse({ description: 'Actualité supprimée', type: ActualiteResponseDto })
  @ApiNotFoundResponse({ description: 'Actualité non trouvée' })
  remove(@Param('id') id: string) {
    return this.actualitesService.remove(id);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.ADMIN_NATIONAL)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Restaurer une actualité supprimée' })
  @ApiParam({ name: 'id', description: "Identifiant de l'actualité" })
  @ApiOkResponse({ description: 'Actualité restaurée', type: ActualiteResponseDto })
  restore(@Param('id') id: string) {
    return this.actualitesService.restore(id);
  }

  // ── BACK-OFFICE ──────────────────────────────────────────────────────────
  // Déclaré AVANT `:id`, sinon « admin » serait capté comme un identifiant.

  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Liste back-office des actualités',
    description:
      'Retourne tous les statuts, brouillons compris, avec filtre `statut` optionnel.',
  })
  @ApiOkResponse({ description: 'Liste paginée' })
  findAllAdmin(
    @Query() query: ActualitesSearchDto,
    @CurrentUser() actor: AuthenticatedActor,
  ) {
    return this.actualitesService.findAll(query, actor, query.statut);
  }

  // ── LECTURE PUBLIQUE ─────────────────────────────────────────────────────

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Liste des actualités publiées',
    description:
      'Visiteurs et membres ne voient que les actualités publiées. Les rôles éditoriaux voient aussi les brouillons.',
  })
  @ApiOkResponse({ description: 'Liste paginée des actualités' })
  findAll(
    @Query() query: ActualitesSearchDto,
    @CurrentUser() actor?: AuthenticatedActor,
  ) {
    return this.actualitesService.findAll(query, actor);
  }

  @Get('slug/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Trouver par slug' })
  @ApiParam({ name: 'slug', description: "Slug unique de l'actualité" })
  @ApiOkResponse({ description: 'Actualité trouvée', type: ActualiteResponseDto })
  @ApiNotFoundResponse({ description: 'Actualité non trouvée' })
  findBySlug(
    @Param('slug') slug: string,
    @CurrentUser() actor?: AuthenticatedActor,
  ) {
    return this.actualitesService.findBySlug(slug, actor);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Trouver par identifiant' })
  @ApiParam({ name: 'id', description: "Identifiant de l'actualité" })
  @ApiOkResponse({ description: 'Actualité trouvée', type: ActualiteResponseDto })
  @ApiNotFoundResponse({ description: 'Actualité non trouvée ou non publiée' })
  @ApiUnauthorizedResponse({ description: 'Token invalide' })
  findOne(@Param('id') id: string, @CurrentUser() actor?: AuthenticatedActor) {
    return this.actualitesService.findOne(id, actor);
  }
}
