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
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import {Request} from 'express';
import {User} from '@prisma/client';
import {ActualitesService} from './actualites.service';
import {CreateActualiteDto} from './dto/create-actualite.dto';
import {UpdateActualiteDto} from './dto/update-actualite.dto';
import {FileInterceptor} from "@nestjs/platform-express";
import {GenerateConfigService} from '../../common/services/generate-config.service';
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
import {ActualitesSearchDto} from './dto/actualites-search.dto';
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {OptionalJwtAuthGuard} from "../auth/guards/optional-jwt-auth.guard";
import {ActualiteResponseDto} from './dto/actualite-response.dto';

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
  @UseGuards(OptionalJwtAuthGuard)
  findAll(@Query() query: ActualitesSearchDto, @Req() req: Request) {
    const user = req.user as User | undefined;
    return this.actualitesService.findAll(query, user?.id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Trouver par slug' })
  @ApiParam({ name: 'slug', description: 'Slug unique de l\'actualité', example: 'inauguration-du-nouveau-pont' })
  @ApiOkResponse({ description: 'Actualité trouvée', type: ActualiteResponseDto })
  @ApiNotFoundResponse({ description: 'Actualité non trouvée' })
  @UseGuards(OptionalJwtAuthGuard)
  findBySlug(@Param('slug') slug: string, @Req() req: Request) {
    const user = req.user as User | undefined;
    return this.actualitesService.findBySlug(slug, user?.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Trouver par ID' })
  @ApiParam({ name: 'id', description: 'Identifiant de l\'actualité', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Actualité trouvée', type: ActualiteResponseDto })
  @ApiNotFoundResponse({ description: 'Actualité non trouvée' })
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as User | undefined;
    return this.actualitesService.findOne(id, user?.id);
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
