import {Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards} from '@nestjs/common';
import { CategorieSignalementService } from './categorie-signalement.service';
import { CreateCategorieSignalementDto } from '../dto/categorie-signalement-dto/create-categorie-signalement.dto';
import { UpdateCategorieSignalementDto } from '../dto/categorie-signalement-dto/update-categorie-signalement.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth
} from '@nestjs/swagger';
import { CategorieSignalementDto } from '../dto/categorie-signalement-dto/categorie-signalement.dto';
import {JwtAuthGuard} from "../../auth/guards/jwt-auth.guard";
import {AdminGuard} from "../../auth/guards/admin.guard";

@ApiTags('Catégorie Signalement')
@ApiBearerAuth()
@Controller('categorie-signalement')
export class CategorieSignalementController {
  constructor(private readonly categorieSignalementService: CategorieSignalementService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une nouvelle catégorie de signalement',
    description: 'Permet de créer une nouvelle catégorie pour classer les signalements citoyens (ex: Voirie, Éclairage, Déchets, etc.)',
  })
  @ApiBody({
    type: CreateCategorieSignalementDto,
    description: 'Données de la catégorie à créer',
    examples: {
      voirie: {
        summary: 'Catégorie Voirie',
        value: {
          nom: 'Voirie',
          description: 'Problèmes liés à la voirie, comme les nids-de-poule ou les trottoirs endommagés',
          validationObligatoire: true,
        },
      },
      eclairage: {
        summary: 'Catégorie Éclairage Public',
        value: {
          nom: 'Éclairage Public',
          description: 'Problèmes d\'éclairage public, lampadaires défectueux',
          validationObligatoire: false,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'La catégorie a été créée avec succès',
    type: CategorieSignalementDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Données invalides',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non authentifié',
  })
  @UseGuards(JwtAuthGuard, AdminGuard)
  async create(@Body() createCategorieSignalementDto: CreateCategorieSignalementDto) {
    return await this.categorieSignalementService.create(createCategorieSignalementDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Récupérer toutes les catégories de signalement',
    description: 'Retourne la liste complète de toutes les catégories de signalement disponibles',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liste des catégories récupérée avec succès',
    type: [CategorieSignalementDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non authentifié',
  })
  async findAll() {
    return await this.categorieSignalementService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer une catégorie par son ID',
    description: 'Retourne les détails d\'une catégorie de signalement spécifique',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant unique de la catégorie',
    example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Catégorie trouvée',
    type: CategorieSignalementDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Catégorie non trouvée',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non authentifié',
  })
  async findOne(@Param('id') id: string) {
    return await this.categorieSignalementService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour une catégorie',
    description: 'Permet de modifier les informations d\'une catégorie de signalement existante',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant unique de la catégorie à modifier',
    example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
    type: String,
  })
  @ApiBody({
    type: UpdateCategorieSignalementDto,
    description: 'Données à mettre à jour (tous les champs sont optionnels)',
    examples: {
      updateNom: {
        summary: 'Modifier le nom',
        value: {
          nom: 'Voirie et Infrastructure',
        },
      },
      updateValidation: {
        summary: 'Modifier la validation obligatoire',
        value: {
          validationObligatoire: false,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Catégorie mise à jour avec succès',
    type: CategorieSignalementDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Données invalides',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Catégorie non trouvée',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non authentifié',
  })
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(@Param('id') id: string, @Body() updateCategorieSignalementDto: UpdateCategorieSignalementDto) {
    return await this.categorieSignalementService.update(id, updateCategorieSignalementDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer une catégorie',
    description: 'Supprime définitivement une catégorie de signalement. Attention : cette action est irréversible.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant unique de la catégorie à supprimer',
    example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Catégorie supprimée avec succès',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Catégorie non trouvée',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Impossible de supprimer la catégorie car elle est utilisée par des signalements',
  })
  @UseGuards(JwtAuthGuard, AdminGuard)
  async remove(@Param('id') id: string) {
    await this.categorieSignalementService.remove(id);
  }
}


