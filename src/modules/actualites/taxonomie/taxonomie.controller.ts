import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminRole } from '../../../generated/prisma/client';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { AdminRolesGuard } from '../../auth/guards/admin-roles.guard';
import { AdminRoles } from '../../auth/decorators/admin-roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TaxonomieService } from './taxonomie.service';
import { EDITORIAL_ROLES } from '../actualites.service';
import {
  CategorieActualiteResponseDto,
  CreateCategorieActualiteDto,
  TagActualiteResponseDto,
  UpdateCategorieActualiteDto,
} from './dto/taxonomie.dto';

/**
 * Catégories d'actualité.
 *
 * Contrôleur distinct de `actualites` et non sous-ressource : sous
 * `/actualites/categories`, la route entrerait en concurrence avec
 * `GET /actualites/:id`, dont l'ordre de déclaration deviendrait significatif.
 */
@ApiTags('Actualités — catégories')
@Controller('categorie-actualite')
export class CategorieActualiteController {
  constructor(private readonly taxonomie: TaxonomieService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les catégories',
    description:
      "Accès public. Le compteur ne porte que sur les actualités publiées et non supprimées.",
  })
  @ApiOkResponse({ type: [CategorieActualiteResponseDto] })
  findAll() {
    return this.taxonomie.findAllCategories();
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL_ROLES)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Créer une catégorie (back-office)' })
  @ApiCreatedResponse({ type: CategorieActualiteResponseDto })
  @ApiConflictResponse({ description: 'Slug déjà utilisé' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  @ApiForbiddenResponse({ description: 'Réservé aux rôles éditoriaux' })
  create(@Body() dto: CreateCategorieActualiteDto) {
    return this.taxonomie.createCategorie(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL_ROLES)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Modifier une catégorie (back-office)',
    description:
      "Le slug n'est pas modifiable : il sert d'identifiant stable dans les URL du site.",
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CategorieActualiteResponseDto })
  @ApiNotFoundResponse({ description: 'Catégorie introuvable' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategorieActualiteDto,
  ) {
    return this.taxonomie.updateCategorie(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.ADMIN_NATIONAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Retirer une catégorie (Administrateur national)',
    description:
      'Suppression réversible : les actualités classées dans cette catégorie ne sont pas touchées.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNotFoundResponse({ description: 'Catégorie introuvable' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.taxonomie.removeCategorie(id);
  }
}

/**
 * Tags d'actualité.
 *
 * Pas de création : les tags naissent de la rédaction d'une actualité. Seules
 * la consultation et la purge sont exposées.
 */
@ApiTags('Actualités — tags')
@Controller('tag-actualite')
export class TagActualiteController {
  constructor(private readonly taxonomie: TaxonomieService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les tags',
    description:
      "Accès public. Le compteur ne porte que sur les actualités publiées et non supprimées.",
  })
  @ApiOkResponse({ type: [TagActualiteResponseDto] })
  findAll() {
    return this.taxonomie.findAllTags();
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Supprimer un tag (back-office)',
    description:
      "Ménage des tags parasites nés d'une faute de frappe. Les actualités sont conservées, seul le rattachement disparaît.",
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNotFoundResponse({ description: 'Tag introuvable' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.taxonomie.removeTag(id);
  }
}
