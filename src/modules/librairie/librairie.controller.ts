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
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LibrairieService } from './librairie.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentResponseDto, PublicDocumentResponseDto } from './dto/document-response.dto';
import { UploadDocumentRequestDto, UploadDocumentResponseDto } from './dto/upload-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminRolesGuard } from '../auth/guards/admin-roles.guard';
import { AdminRoles } from '../auth/decorators/admin-roles.decorator';
import { AdminRole } from '../../generated/prisma/client';
import { Request } from 'express';
import { AuthenticatedActor } from 'src/common/types/authenticated-actor';
import { SearchDocumentDto } from './dto/search-document.dto';

/** Rôles éditoriaux : gestion de la librairie de documents depuis le back-office. */
const EDITORIAL = [AdminRole.ADMIN_NATIONAL, AdminRole.CHARGE_COMMUNICATION];

@ApiTags('Librairie')
@Controller('librairie')
export class LibrairieController {
  constructor(private readonly librairieService: LibrairieService) {}

  @Post('upload-url')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: "Demander une URL présignée pour un document ou sa couverture",
    description:
      "Génère une clé d'objet sous `librairie/<documentId>/` et une URL PUT présignée. Le client envoie ensuite le fichier directement à R2, puis fournit la clé (et pour la couverture, le même documentId lors du second appel) via `fichierKey`/`coverKey` au POST /librairie.",
  })
  @ApiBody({ type: UploadDocumentRequestDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'URL présignée générée',
    type: UploadDocumentResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  async uploadUrl(@Body() dto: UploadDocumentRequestDto) {
    return this.librairieService.buildUploadUrl(dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Créer un document', description: "Crée une nouvelle entrée de document à partir d'une clé de fichier (et éventuellement de couverture) déjà uploadée sur R2." })
  @ApiBody({ type: CreateDocumentDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Document créé avec succès', type: DocumentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  create(
    @Req() req: Request,
    @Body() createLibrairieDto: CreateDocumentDto,
  ) {
    const user = req.user as AuthenticatedActor;
    createLibrairieDto.userId = user.id;

    return this.librairieService.create(createLibrairieDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
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

  @Get('public')
  @ApiOperation({ summary: 'Liste publique des documents', description: 'Retourne les documents paginés sans données sensibles. Aucune authentification requise.' })
  @ApiOkResponse({
    description: 'Liste paginée de documents publics',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginatedResponseDto' },
        { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/PublicDocumentResponseDto' } } } },
      ],
    },
  })
  findAllPublic(@Query() searchParams: SearchDocumentDto) {
    return this.librairieService.findAllPublic(searchParams);
  }

  @Get('public/categories')
  @ApiOperation({
    summary: 'Liste des catégories de documents',
    description:
      'Retourne les catégories distinctes des documents, pour alimenter les filtres. Aucune authentification requise.',
  })
  @ApiOkResponse({
    description: 'Liste des catégories',
    schema: { type: 'array', items: { type: 'string' } },
  })
  findCategories() {
    return this.librairieService.findCategories();
  }

  @Get('public/:id')
  @ApiOperation({ summary: 'Détail public d\'un document', description: 'Retourne les informations publiques d\'un document sans données sensibles. Aucune authentification requise.' })
  @ApiParam({ name: 'id', description: 'Identifiant du document', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({ description: 'Document trouvé', type: PublicDocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Document non trouvé' })
  findOnePublic(@Param('id') id: string) {
    return this.librairieService.findOnePublic(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Détail d\'un document' })
  @ApiParam({ name: 'id', description: 'Identifiant du document', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({ description: 'Document trouvé', type: DocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Document non trouvé' })
  findOne(@Param('id') id: string) {
    return this.librairieService.findOne(id);
  }

  @Get(':id/file')
  @Redirect()
  @ApiOperation({ summary: 'Télécharger le fichier', description: "Redirige (302) vers l'URL publique R2 du fichier associé au document." })
  @ApiParam({ name: 'id', description: 'Identifiant du document', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: HttpStatus.FOUND, description: 'Redirection vers le fichier' })
  @ApiNotFoundResponse({ description: 'Document non trouvé' })
  async getFile(@Param('id') id: string) {
    return await this.librairieService.getFile(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
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
  @UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
  @AdminRoles(...EDITORIAL)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Supprimer un document' })
  @ApiParam({ name: 'id', description: 'Identifiant du document', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({ description: 'Document supprimé' })
  @ApiNotFoundResponse({ description: 'Document non trouvé' })
  remove(@Param('id') id: string) {
    return this.librairieService.remove(id);
  }
}
