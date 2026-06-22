import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/services/prisma.service';
import { AddPointsDto } from './dto/add-points.dto';
import {
  BadgeDto,
  GamificationStateDto,
  LeaderboardEntryDto,
} from './dto/gamification-response.dto';

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Règle de niveau : un palier tous les 100 points.
   * Exemples : 0-99 pts => niveau 1, 100-199 pts => niveau 2, etc.
   * Les points négatifs sont ramenés au niveau 1 minimum.
   */
  private calculerNiveau(points: number): number {
    return 1 + Math.floor(Math.max(0, points) / 100);
  }

  /**
   * Dérive des badges simples à partir du niveau atteint.
   * `obtenuLe` correspond à la dernière mise à jour de l'état de gamification.
   */
  private deriverBadges(niveau: number, obtenuLe: Date): BadgeDto[] {
    const badges: BadgeDto[] = [];

    if (niveau >= 2) {
      badges.push({ code: 'DEBUTANT', label: 'Débutant confirmé', obtenuLe });
    }
    if (niveau >= 5) {
      badges.push({ code: 'CONFIRME', label: 'Citoyen confirmé', obtenuLe });
    }
    if (niveau >= 10) {
      badges.push({ code: 'EXPERT', label: 'Expert engagé', obtenuLe });
    }

    return badges;
  }

  private toState(gamification: {
    points: number;
    niveau: number;
    updatedAt: Date;
  }): GamificationStateDto {
    return {
      points: gamification.points,
      niveau: gamification.niveau,
      badges: this.deriverBadges(gamification.niveau, gamification.updatedAt),
    };
  }

  /**
   * Retourne l'état de gamification de l'utilisateur.
   * Crée l'état initial (0 point, niveau 1) s'il n'existe pas encore.
   */
  async getMyState(userId: string): Promise<GamificationStateDto> {
    const gamification = await this.prisma.userGamification.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    return this.toState(gamification);
  }

  /**
   * Attribue des points à l'utilisateur, journalise la transaction et
   * recalcule le niveau. L'ensemble est exécuté dans une transaction atomique.
   */
  async addPoints(userId: string, dto: AddPointsDto): Promise<GamificationStateDto> {
    const gamification = await this.prisma.$transaction(async (tx) => {
      const courant = await tx.userGamification.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });

      const nouveauTotal = courant.points + dto.points;
      const nouveauNiveau = this.calculerNiveau(nouveauTotal);

      const misAJour = await tx.userGamification.update({
        where: { userId },
        data: { points: nouveauTotal, niveau: nouveauNiveau },
      });

      await tx.pointTransaction.create({
        data: { userId, points: dto.points, raison: dto.raison },
      });

      return misAJour;
    });

    return this.toState(gamification);
  }

  /**
   * Classement des utilisateurs par points décroissants.
   */
  async getLeaderboard(limit: number): Promise<LeaderboardEntryDto[]> {
    const entries = await this.prisma.userGamification.findMany({
      take: limit,
      orderBy: { points: 'desc' },
      include: { user: { select: { id: true, fullname: true } } },
    });

    return entries.map((entry) => ({
      userId: entry.userId,
      nom: entry.user.fullname,
      points: entry.points,
      niveau: entry.niveau,
    }));
  }
}
