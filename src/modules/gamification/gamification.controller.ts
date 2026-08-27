import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedActor } from 'src/common/types/authenticated-actor';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { GamificationService } from './gamification.service';
import { AddPointsDto } from './dto/add-points.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import {
  GamificationStateDto,
  LeaderboardEntryDto,
} from './dto/gamification-response.dto';

@ApiTags('Gamification')
@Controller('gamification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Récupérer son état de gamification',
    description:
      "Retourne les points, le niveau et les badges de l'utilisateur authentifié. L'état est créé automatiquement s'il n'existe pas.",
  })
  @ApiOkResponse({ description: 'État de gamification', type: GamificationStateDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Non authentifié' })
  getMe(@Req() req: Request) {
    const user = req.user as AuthenticatedActor;
    return this.gamificationService.getEtat(user.id);
  }

  // Mitigation immediate : cet endpoint accepte `points` et `raison` du client.
  // Laisse ouvert a tout membre authentifie, il permettait a n'importe qui de
  // s'attribuer un nombre arbitraire de points. L'attribution devrait etre
  // derivee des actions reelles (like, commentaire, quiz) cote serveur ; en
  // attendant ce chantier, on le reserve au back-office.
  @Post('points')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Attribuer des points à un membre (back-office)',
    description:
      "Ajoute des points au membre ciblé, journalise la transaction et retourne l'état mis à jour. Réservé aux comptes back-office.",
  })
  @ApiOkResponse({ description: 'État de gamification mis à jour', type: GamificationStateDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Non authentifié' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Réservé au back-office' })
  addPoints(@Body() dto: AddPointsDto) {
    return this.gamificationService.ajouterPoints(dto.userId, dto);
  }

  @Get('leaderboard')
  @ApiOperation({
    summary: 'Classement des utilisateurs',
    description: 'Retourne les utilisateurs triés par points décroissants.',
  })
  @ApiOkResponse({ description: 'Classement', type: [LeaderboardEntryDto] })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Non authentifié' })
  getLeaderboard(@Query() query: LeaderboardQueryDto) {
    return this.gamificationService.getLeaderboard(query);
  }
}
