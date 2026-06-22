import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { EngagementService } from './engagement.service';
import { ModerationListQueryDto } from './dto/moderation-list-query.dto';
import { MasquerCommentaireDto } from './dto/masquer-commentaire.dto';
import {
  ModerationCommentaireResponseDto,
  PaginatedModerationCommentairesDto,
} from './dto/moderation-response.dto';

@ApiTags('Modération')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('commentaires')
export class CommentaireModerationController {
  constructor(private readonly engagementService: EngagementService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister tous les commentaires (modération)',
    description:
      'Retourne la liste paginée de tous les commentaires (y compris masqués), tous contenus confondus, avec leur cible et leur auteur. Réservé aux administrateurs.',
  })
  @ApiOkResponse({
    description: 'Liste paginée des commentaires',
    type: PaginatedModerationCommentairesDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Non authentifié' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Accès réservé aux administrateurs' })
  listAll(@Query() query: ModerationListQueryDto) {
    return this.engagementService.listAllCommentairesForModeration(query);
  }

  @Patch(':id/masquer')
  @ApiOperation({
    summary: 'Masquer / démasquer un commentaire',
    description:
      'Active ou désactive la modération soft d\'un commentaire. Un commentaire masqué reste en base mais est exclu des lectures publiques. Réservé aux administrateurs.',
  })
  @ApiParam({ name: 'id', description: 'Identifiant du commentaire' })
  @ApiOkResponse({
    description: 'Commentaire mis à jour',
    type: ModerationCommentaireResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Non authentifié' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Accès réservé aux administrateurs' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Commentaire non trouvé' })
  masquer(@Param('id') id: string, @Body() dto: MasquerCommentaireDto) {
    return this.engagementService.setCommentaireMasque(id, dto.masque);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer définitivement un commentaire',
    description:
      'Supprime définitivement un commentaire de la base de données. Réservé aux administrateurs.',
  })
  @ApiParam({ name: 'id', description: 'Identifiant du commentaire' })
  @ApiNoContentResponse({ description: 'Commentaire supprimé' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Non authentifié' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Accès réservé aux administrateurs' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Commentaire non trouvé' })
  async remove(@Param('id') id: string) {
    await this.engagementService.deleteCommentaire(id);
  }
}
