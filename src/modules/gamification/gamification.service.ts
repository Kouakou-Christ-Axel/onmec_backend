import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/services/prisma.service';
import { AddPointsDto } from './dto/add-points.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import {
  BadgeDto,
  GamificationStateDto,
  LeaderboardEntryDto,
} from './dto/gamification-response.dto';

/**
 * Règle de niveau SIMPLE : un nouveau niveau tous les 100 points, à partir du
 * niveau 1 (0 à 99 points => niveau 1).
 *
 * Constante partagée par le calcul TypeScript et l'instruction SQL de
 * `appliquerDelta` : les deux doivent impérativement rester d'accord, sans quoi
 * le niveau retourné par une attribution différerait de celui recalculé
 * ailleurs.
 */
export const POINTS_PAR_NIVEAU = 100;

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  private calculerNiveau(points: number): number {
    return 1 + Math.floor(Math.max(points, 0) / POINTS_PAR_NIVEAU);
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
   * Applique un delta de points en une seule instruction SQL et retourne le
   * nouvel état.
   *
   * La version précédente lisait `points`, calculait le total en JavaScript
   * puis l'écrivait : deux attributions concurrentes lisaient la même valeur de
   * départ et la seconde écrasait la première (mise à jour perdue). Le cas
   * n'avait rien de théorique — les points sont désormais attribués depuis
   * plusieurs modules, et un même membre peut liker et commenter dans la même
   * seconde.
   *
   * `ON CONFLICT DO UPDATE` avec `points = points + delta` fait faire l'addition
   * à Postgres sur la ligne verrouillée, et le niveau est dérivé du total ainsi
   * obtenu dans la même instruction : les deux ne peuvent plus diverger.
   *
   * Le `GREATEST(..., 0)` borne le niveau à 1 si un ajustement négatif du
   * back-office fait passer le total sous zéro ; la division entière de
   * Postgres tronque vers zéro et donnerait sinon un niveau incohérent.
   */
  private async appliquerDelta(
    tx: Prisma.TransactionClient,
    userId: string,
    delta: number,
  ): Promise<{ points: number; niveau: number; updatedAt: Date }> {
    const [etat] = await tx.$queryRaw<
      Array<{ points: number; niveau: number; updatedAt: Date }>
    >`
      INSERT INTO user_gamification ("userId", points, niveau, "updatedAt")
      VALUES (
        ${userId}::uuid,
        ${delta},
        1 + FLOOR(GREATEST(${delta}, 0)::numeric / ${POINTS_PAR_NIVEAU})::int
      , now())
      ON CONFLICT ("userId") DO UPDATE
        SET points = user_gamification.points + EXCLUDED.points,
            niveau = 1 + FLOOR(
              GREATEST(user_gamification.points + EXCLUDED.points, 0)::numeric
              / ${POINTS_PAR_NIVEAU}
            )::int,
            "updatedAt" = now()
      RETURNING points, niveau, "updatedAt"
    `;

    return etat;
  }

  /**
   * Ajoute des points à l'utilisateur, journalise la transaction et recalcule
   * le niveau, puis retourne l'état mis à jour.
   */
  async ajouterPoints(userId: string, dto: AddPointsDto): Promise<GamificationStateDto> {
    const etat = await this.prisma.$transaction(async (tx) => {
      await tx.pointTransaction.create({
        data: { userId, points: dto.points, raison: dto.raison },
      });

      return this.appliquerDelta(tx, userId, dto.points);
    });

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
