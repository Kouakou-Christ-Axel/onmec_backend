import {
  BadRequestException,
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
  UseInterceptors,
} from '@nestjs/common';
import { AuthenticatedActor } from 'src/common/types/authenticated-actor';
import { ActualitesService } from './actualites.service';
import { CreateActualiteDto } from './dto/create-actualite.dto';
import { UpdateActualiteDto } from './dto/update-actualite.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { GenerateConfigService } from '../../common/services/generate-config.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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

const IMAGE_UPLOAD = GenerateConfigService.generateConfigSingleImageUpload(
  './uploads/actualites',
);

const CONTENU_IMAGE_UPLOAD = GenerateConfigService.generateConfigSingleImageUpload(
  './uploads/actualites/contenu',
);

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

  /**
   * Compresse l'image televersee sur place.
   *
   * Les images d'actualites etaient stockees a leur taille d'origine, alors
   * que le module users compressait deja les siennes. `deleteOriginal: true`
   * sans `outputDir` reecrit le fichier au meme chemin, donc `image.filename`
   * reste valide pour construire l'URL.
   */
  private async compressInPlace(image?: Express.Multer.File) {
    if (!image?.path) return;
    await GenerateConfigService.compressImages(
      { img_1: image.path },
      undefined,
      { quality: 75, width: 1600, fit: 'inside' },
      true,
    );
  }

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
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateActualiteDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Actualité créée',
    type: ActualiteResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Rôle éditorial requis' })
  @UseInterceptors(FileInterceptor('image', IMAGE_UPLOAD))
  async create(
    @Body() createActualiteDto: CreateActualiteDto,
    @CurrentUser() actor: AuthenticatedActor,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    await this.compressInPlace(image);
    return this.actualitesService.create(createActualiteDto, actor, image);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Modifier une actualité' })
  @ApiParam({ name: 'id', description: "Identifiant de l'actualité" })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateActualiteDto })
  @ApiOkResponse({ description: 'Actualité mise à jour', type: ActualiteResponseDto })
  @ApiNotFoundResponse({ description: 'Actualité non trouvée' })
  @UseInterceptors(FileInterceptor('image', IMAGE_UPLOAD))
  async update(
    @Param('id') id: string,
    @Body() updateActualiteDto: UpdateActualiteDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    await this.compressInPlace(image);
    return this.actualitesService.update(id, updateActualiteDto, image);
  }

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: "Téléverser une image pour le corps d'un article",
    description:
      "Compresse et stocke une image dans un sous-dossier dédié au contenu (distinct de la couverture), pour l'insertion dans le corps de l'article via l'éditeur.",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Image téléversée',
    schema: { properties: { url: { type: 'string' } } },
  })
  @ApiForbiddenResponse({ description: 'Rôle éditorial requis' })
  @UseInterceptors(FileInterceptor('image', CONTENU_IMAGE_UPLOAD))
  async uploadImage(@UploadedFile() image?: Express.Multer.File) {
    if (!image) {
      throw new BadRequestException('Fichier image requis');
    }
    await this.compressInPlace(image);
    return this.actualitesService.buildContentImageUrl(image);
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
