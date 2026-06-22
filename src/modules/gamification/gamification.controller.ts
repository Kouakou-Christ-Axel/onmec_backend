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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GamificationService } from './gamification.service';
import { AddPointsDto } from './dto/add-points.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import {
  GamificationStateDto,
  LeaderboardEntryDto,
} from './dto/gamification-response.dto';

@ApiTags('Gamification')
@ApiBearerAuth('JWT')
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'État de gamification de l\'utilisateur',
    description:
      'Retourne les points, le niveau et les badges de l\'utilisateur authentifié. L\'état est créé (0 point, niveau 1) s\'il n\'existe pas.',
  })
  @ApiOkResponse({ description: 'État de gamification récupéré', type: GamificationStateDto })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  getMyState(@Req() req: Request) {
    const user = req.user as User;
    return this.gamificationService.getMyState(user.id);
  }

  @Post('points')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Attribuer des points',
    description:
      'Ajoute des points à l\'utilisateur authentifié, journalise la transaction et recalcule son niveau.',
  })
  @ApiBody({ type: AddPointsDto })
  @ApiOkResponse({ description: 'Points attribués, état mis à jour', type: GamificationStateDto })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  addPoints(@Req() req: Request, @Body() dto: AddPointsDto) {
    const user = req.user as User;
    return this.gamificationService.addPoints(user.id, dto);
  }

  @Get('leaderboard')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Classement',
    description: 'Retourne le classement des utilisateurs par points décroissants.',
  })
  @ApiOkResponse({ description: 'Classement récupéré', type: [LeaderboardEntryDto] })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  getLeaderboard(@Query() query: LeaderboardQueryDto) {
    return this.gamificationService.getLeaderboard(query.limit ?? 20);
  }
}
