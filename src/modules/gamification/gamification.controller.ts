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
import { User } from '../../generated/prisma/client';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
    const user = req.user as User;
    return this.gamificationService.getEtat(user.id);
  }

  @Post('points')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Attribuer des points à l'utilisateur",
    description:
      "Ajoute des points à l'utilisateur authentifié, journalise la transaction et retourne l'état mis à jour.",
  })
  @ApiOkResponse({ description: 'État de gamification mis à jour', type: GamificationStateDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Non authentifié' })
  addPoints(@Body() dto: AddPointsDto, @Req() req: Request) {
    const user = req.user as User;
    return this.gamificationService.ajouterPoints(user.id, dto);
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
