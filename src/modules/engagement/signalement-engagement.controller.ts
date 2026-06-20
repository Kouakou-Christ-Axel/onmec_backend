import {
  Body,
  Controller,
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

@ApiTags('Signalement Citoyen')
@Controller('signalement-citoyen')
export class SignalementEngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  @Post(':id/reactions/toggle')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Aimer / ne plus aimer un signalement',
    description:
      'Active ou désactive le like de l\'utilisateur authentifié sur le signalement (toggle idempotent).',
  })
  @ApiParam({ name: 'id', description: 'Identifiant du signalement' })
  @ApiOkResponse({ description: 'État du like mis à jour', type: ReactionToggleResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Non authentifié' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Signalement non trouvé' })
  toggleReaction(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as User;
    return this.engagementService.toggleReaction('signalement', id, user.id);
  }

  @Get(':id/commentaires')
  @ApiOperation({
    summary: "Lister les commentaires d'un signalement",
    description: 'Retourne la liste paginée des commentaires du signalement.',
  })
  @ApiParam({ name: 'id', description: 'Identifiant du signalement' })
  @ApiOkResponse({ description: 'Liste paginée des commentaires', type: PaginatedCommentairesDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Signalement non trouvé' })
  listCommentaires(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.engagementService.listCommentaires('signalement', id, query);
  }

  @Post(':id/commentaires')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Commenter un signalement',
    description: "Ajoute un commentaire de l'utilisateur authentifié sur le signalement.",
  })
  @ApiParam({ name: 'id', description: 'Identifiant du signalement' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Commentaire créé',
    type: CommentaireResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Non authentifié' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Signalement non trouvé' })
  createCommentaire(
    @Param('id') id: string,
    @Body() dto: CreateCommentaireDto,
    @Req() req: Request,
  ) {
    const user = req.user as User;
    return this.engagementService.createCommentaire('signalement', id, user.id, dto);
  }
}
