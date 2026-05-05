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
import { DocumentResponseDto, PublicDocumentResponseDto } from './dto/document-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { User } from '@prisma/client';
import { SearchDocumentDto } from './dto/search-document.dto';
import { UploadValidationPipe } from '../image-processing/upload-validation/upload-validation.pipe';

@ApiTags('Librairie')
@Controller('librairie')
export class LibrairieController {
  constructor(private readonly librairieService: LibrairieService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
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

  @Get('public/:id')
  @ApiOperation({ summary: 'Détail public d\'un document', description: 'Retourne les informations publiques d\'un document sans données sensibles. Aucune authentification requise.' })
  @ApiParam({ name: 'id', description: 'Identifiant du document', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({ description: 'Document trouvé', type: PublicDocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Document non trouvé' })
  findOnePublic(@Param('id') id: string) {
    return this.librairieService.findOnePublic(id);
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
