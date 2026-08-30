import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/services/prisma.service';
import { StatutSignalement, StatutMembre } from '../../generated/prisma/client';
import { AdminStatisticsDto } from './dto/admin-statistics.dto';

@Injectable()
export class AdminStatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatistics(): Promise<AdminStatisticsDto> {
    const [statutGroups, categorieGroups, membreGroups, totalQuiz, quizAgg] =
      await Promise.all([
        this.prisma.signalementCitoyen.groupBy({
          by: ['statut'],
          where: { deletedAt: null },
          _count: true,
        }),
        this.prisma.signalementCitoyen.groupBy({
          by: ['categorieId'],
          where: { deletedAt: null },
          _count: true,
        }),
        this.prisma.member.groupBy({
          by: ['statut'],
          where: { deletedAt: null },
          _count: true,
        }),
        this.prisma.quiz.count(),
        this.prisma.userQuiz.aggregate({
          _count: true,
          _avg: { score: true },
        }),
      ]);

    // Noms des catégories : lookup séparé, pas filtré sur deletedAt — une
    // catégorie soft-supprimée peut encore porter des signalements existants ;
    // la filtrer ferait disparaître la ligne et casserait
    // sum(parCategorie) === signalements.total.
    const categorieIds = categorieGroups.map((g) => g.categorieId);
    const categories = categorieIds.length
      ? await this.prisma.categorieSignalement.findMany({
          where: { id: { in: categorieIds } },
          select: { id: true, nom: true },
        })
      : [];
    const nomById = new Map(categories.map((c) => [c.id, c.nom]));

    // Zero-fill : toutes les valeurs de l'enum à 0, puis écrasées par le groupBy.
    const parStatut = Object.fromEntries(
      Object.values(StatutSignalement).map((s) => [s, 0]),
    ) as Record<StatutSignalement, number>;
    for (const g of statutGroups) parStatut[g.statut] = g._count;

    const parCategorie = categorieGroups.map((g) => ({
      categorieId: g.categorieId,
      nom: nomById.get(g.categorieId) ?? 'Catégorie inconnue',
      total: g._count,
    }));

    const parStatutMembre = Object.fromEntries(
      Object.values(StatutMembre).map((s) => [s, 0]),
    ) as Record<StatutMembre, number>;
    for (const g of membreGroups) parStatutMembre[g.statut] = g._count;

    return {
      signalements: {
        total: statutGroups.reduce((sum, g) => sum + g._count, 0),
        parStatut,
        parCategorie,
      },
      membres: {
        total: membreGroups.reduce((sum, g) => sum + g._count, 0),
        actifs: parStatutMembre.ACTIF,
        suspendus: parStatutMembre.SUSPENDU,
        bannis: parStatutMembre.BANNI,
      },
      quiz: {
        totalQuiz,
        totalTentatives: quizAgg._count,
        scoreMoyenGlobal: Math.round(quizAgg._avg.score ?? 0),
      },
    };
  }
}
