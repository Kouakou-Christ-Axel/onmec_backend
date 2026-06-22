import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { User } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EngagementService } from './engagement.service';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import {
  CommentaireResponseDto,
  PaginatedCommentairesDto,
  ReactionToggleResponseDto,
} from './dto/engagement-response.dto';

@ApiTags('Actualités')
@Controller('actualites')
export class ActualiteEngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  @Post(':id/reactions/toggle')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Aimer / ne plus aimer une actualité',
    description:
      'Active ou désactive le like de l\'utilisateur authentifié sur l\'actualité (toggle idempotent).',
  })
  @ApiParam({ name: 'id', description: "Identifiant de l'actualité" })
  @ApiOkResponse({ description: 'État du like mis à jour', type: ReactionToggleResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Non authentifié' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Actualité non trouvée' })
  toggleReaction(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as User;
    return this.engagementService.toggleReaction('actualite', id, user.id);
  }

  @Get(':id/commentaires')
  @ApiOperation({
    summary: "Lister les commentaires d'une actualité",
    description: "Retourne la liste paginée des commentaires de l'actualité.",
  })
  @ApiParam({ name: 'id', description: "Identifiant de l'actualité" })
  @ApiOkResponse({ description: 'Liste paginée des commentaires', type: PaginatedCommentairesDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Actualité non trouvée' })
  listCommentaires(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.engagementService.listCommentaires('actualite', id, query);
  }

  @Post(':id/commentaires')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Commenter une actualité',
    description: "Ajoute un commentaire de l'utilisateur authentifié sur l'actualité.",
  })
  @ApiParam({ name: 'id', description: "Identifiant de l'actualité" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Commentaire créé',
    type: CommentaireResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Non authentifié' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Actualité non trouvée' })
  createCommentaire(
    @Param('id') id: string,
    @Body() dto: CreateCommentaireDto,
    @Req() req: Request,
  ) {
    const user = req.user as User;
    return this.engagementService.createCommentaire('actualite', id, user.id, dto);
  }

  @Delete(':id/commentaires/:commentaireId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: "Supprimer un commentaire d'une actualité",
    description:
      "Supprime un commentaire. Autorisé à l'auteur du commentaire ou à un administrateur.",
  })
  @ApiParam({ name: 'id', description: "Identifiant de l'actualité" })
  @ApiParam({ name: 'commentaireId', description: 'Identifiant du commentaire' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Commentaire supprimé' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Non authentifié' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Action non autorisée' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Commentaire non trouvé' })
  deleteCommentaire(
    @Param('id') id: string,
    @Param('commentaireId') commentaireId: string,
    @Req() req: Request,
  ) {
    const user = req.user as User;
    return this.engagementService.deleteOwnCommentaire(
      'actualite',
      id,
      commentaireId,
      user,
    );
  }
}
