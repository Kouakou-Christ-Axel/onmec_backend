import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/services/prisma.service';
import { AddPointsDto } from './dto/add-points.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import {
  BadgeDto,
  GamificationStateDto,
  LeaderboardEntryDto,
} from './dto/gamification-response.dto';

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Règle de niveau SIMPLE : un nouveau niveau tous les 100 points.
   * Le niveau commence à 1 (0 à 99 points => niveau 1).
   */
  private calculerNiveau(points: number): number {
    return 1 + Math.floor(points / 100);
  }

  /**
   * Calcule les badges dérivés du niveau atteint.
   * Chaque badge porte la date `obtenuLe` correspondant à la dernière mise à
   * jour de l'état (faute de date d'obtention individuelle persistée).
   */
  private calculerBadges(niveau: number, obtenuLe: Date): BadgeDto[] {
    const badges: BadgeDto[] = [];
    const date = obtenuLe.toISOString();

    if (niveau >= 2) {
      badges.push({ code: 'actif', label: 'Citoyen actif', obtenuLe: date });
    }
    if (niveau >= 5) {
      badges.push({ code: 'engage', label: 'Citoyen engagé', obtenuLe: date });
    }
    if (niveau >= 10) {
      badges.push({ code: 'expert', label: 'Expert civique', obtenuLe: date });
    }

    return badges;
  }

  /**
   * Met en forme l'état de gamification (points, niveau, badges dérivés).
   */
  private formaterEtat(points: number, niveau: number, updatedAt: Date): GamificationStateDto {
    return {
      points,
      niveau,
      badges: this.calculerBadges(niveau, updatedAt),
    };
  }

  /**
   * Retourne l'état de gamification de l'utilisateur.
   * Crée l'état initial (points=0, niveau=1) s'il n'existe pas encore.
   */
  async getEtat(userId: string): Promise<GamificationStateDto> {
    const etat = await this.prisma.userGamification.upsert({
      where: { userId },
      create: { userId, points: 0, niveau: 1 },
      update: {},
    });

    return this.formaterEtat(etat.points, etat.niveau, etat.updatedAt);
  }

  /**
   * Ajoute des points à l'utilisateur, journalise la transaction et recalcule
   * le niveau, puis retourne l'état mis à jour.
   */
  async ajouterPoints(userId: string, dto: AddPointsDto): Promise<GamificationStateDto> {
    // Récupère l'état courant (ou le crée) pour calculer le nouveau total.
    const etatCourant = await this.prisma.userGamification.upsert({
      where: { userId },
      create: { userId, points: 0, niveau: 1 },
      update: {},
    });

    const nouveauTotal = etatCourant.points + dto.points;
    const nouveauNiveau = this.calculerNiveau(nouveauTotal);

    const [etat] = await this.prisma.$transaction([
      this.prisma.userGamification.update({
        where: { userId },
        data: { points: nouveauTotal, niveau: nouveauNiveau },
      }),
      this.prisma.pointTransaction.create({
        data: { userId, points: dto.points, raison: dto.raison },
      }),
    ]);

    return this.formaterEtat(etat.points, etat.niveau, etat.updatedAt);
  }

  /**
   * Classement des utilisateurs triés par points décroissants.
   */
  async getLeaderboard(query: LeaderboardQueryDto): Promise<LeaderboardEntryDto[]> {
    const entries = await this.prisma.userGamification.findMany({
      orderBy: { points: 'desc' },
      take: query.limit,
      include: { user: { select: { fullname: true } } },
    });

    return entries.map((entry) => ({
      userId: entry.userId,
      nom: entry.user.fullname,
      points: entry.points,
      niveau: entry.niveau,
    }));
  }
}
