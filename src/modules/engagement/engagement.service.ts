import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/services/prisma.service';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import {
  CommentaireResponseDto,
  PaginatedCommentairesDto,
  ReactionToggleResponseDto,
} from './dto/engagement-response.dto';
import { ModerationListQueryDto } from './dto/moderation-list-query.dto';
import {
  ModerationCommentaireResponseDto,
  PaginatedModerationCommentairesDto,
} from './dto/moderation-response.dto';

export type EngagementTarget = 'signalement' | 'actualite';

@Injectable()
export class EngagementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Construit le filtre Prisma ciblant soit un signalement, soit une actualité.
   */
  private targetWhere(target: EngagementTarget, targetId: string) {
    return target === 'signalement'
      ? { signalementId: targetId }
      : { actualiteId: targetId };
  }

  /**
   * Vérifie l'existence de la cible (signalement ou actualité), sinon lève 404.
   */
  private async ensureTargetExists(target: EngagementTarget, targetId: string): Promise<void> {
    if (target === 'signalement') {
      const exists = await this.prisma.signalementCitoyen.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!exists) {
        throw new NotFoundException(`Signalement avec l'id ${targetId} introuvable`);
      }
    } else {
      const exists = await this.prisma.actualite.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!exists) {
        throw new NotFoundException(`Actualité avec l'id ${targetId} introuvable`);
      }
    }
  }

  /**
   * Active ou désactive le like d'un utilisateur sur une cible (idempotent grâce à
   * la contrainte d'unicité userId + cible).
   */
  async toggleReaction(
    target: EngagementTarget,
    targetId: string,
    userId: string,
  ): Promise<ReactionToggleResponseDto> {
    await this.ensureTargetExists(target, targetId);

    const where = { userId, ...this.targetWhere(target, targetId) };

    const existing = await this.prisma.reaction.findFirst({ where });

    let liked: boolean;
    if (existing) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
      liked = false;
    } else {
      await this.prisma.reaction.create({ data: where });
      liked = true;
    }

    const likesCount = await this.prisma.reaction.count({
      where: this.targetWhere(target, targetId),
    });

    return { liked, likesCount };
  }

  /**
   * Liste paginée des commentaires d'une cible.
   */
  async listCommentaires(
    target: EngagementTarget,
    targetId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedCommentairesDto> {
    await this.ensureTargetExists(target, targetId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    // Les commentaires masqués par la modération sont exclus des lectures publiques.
    const where = { ...this.targetWhere(target, targetId), masque: false };

    const [total, commentaires] = await Promise.all([
      this.prisma.commentaire.count({ where }),
      this.prisma.commentaire.findMany({
        where,
        include: {
          user: { select: { id: true, fullname: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: commentaires.map((c) => this.mapCommentaire(c)),
      total,
      page,
      limit,
    };
  }

  /**
   * Crée un commentaire sur une cible.
   */
  async createCommentaire(
    target: EngagementTarget,
    targetId: string,
    userId: string,
    dto: CreateCommentaireDto,
  ): Promise<CommentaireResponseDto> {
    await this.ensureTargetExists(target, targetId);

    const commentaire = await this.prisma.commentaire.create({
      data: {
        contenu: dto.contenu,
        userId,
        ...this.targetWhere(target, targetId),
      },
      include: {
        user: { select: { id: true, fullname: true, avatar: true } },
      },
    });

    return this.mapCommentaire(commentaire);
  }

  /**
   * Met en forme un commentaire au format attendu par l'API.
   */
  private mapCommentaire(commentaire: any): CommentaireResponseDto {
    return {
      id: commentaire.id,
      contenu: commentaire.contenu,
      createdAt: commentaire.createdAt,
      auteur: {
        id: commentaire.user?.id ?? null,
        nom: commentaire.user?.fullname ?? null,
        avatar: commentaire.user?.avatar ?? null,
      },
    };
  }

  /**
   * [Modération] Liste paginée de tous les commentaires (masqués inclus),
   * tous contenus confondus, avec leur cible et leur auteur.
   */
  async listAllCommentairesForModeration(
    query: ModerationListQueryDto,
  ): Promise<PaginatedModerationCommentairesDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    let where: any = {};
    if (query.cible === 'signalement') {
      where = { signalementId: { not: null } };
    } else if (query.cible === 'actualite') {
      where = { actualiteId: { not: null } };
    }

    const [total, commentaires] = await Promise.all([
      this.prisma.commentaire.count({ where }),
      this.prisma.commentaire.findMany({
        where,
        include: {
          user: { select: { id: true, fullname: true, avatar: true } },
          signalement: { select: { id: true, titre: true } },
          actualite: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: commentaires.map((c) => this.mapModerationCommentaire(c)),
      total,
      page,
      limit,
    };
  }

  /**
   * [Modération] Masque ou démasque un commentaire (modération soft).
   */
  async setCommentaireMasque(
    id: string,
    masque: boolean,
  ): Promise<ModerationCommentaireResponseDto> {
    const existing = await this.prisma.commentaire.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Commentaire avec l'id ${id} introuvable`);
    }

    const commentaire = await this.prisma.commentaire.update({
      where: { id },
      data: { masque },
      include: {
        user: { select: { id: true, fullname: true, avatar: true } },
        signalement: { select: { id: true, titre: true } },
        actualite: { select: { id: true, title: true } },
      },
    });

    return this.mapModerationCommentaire(commentaire);
  }

  /**
   * [Modération] Supprime définitivement un commentaire.
   */
  async deleteCommentaire(id: string): Promise<void> {
    const existing = await this.prisma.commentaire.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Commentaire avec l'id ${id} introuvable`);
    }

    await this.prisma.commentaire.delete({ where: { id } });
  }

  /**
   * Met en forme un commentaire pour la modération (cible incluse).
   */
  private mapModerationCommentaire(
    commentaire: any,
  ): ModerationCommentaireResponseDto {
    let cible: ModerationCommentaireResponseDto['cible'] = null;
    if (commentaire.signalement) {
      cible = {
        type: 'signalement',
        id: commentaire.signalement.id,
        titre: commentaire.signalement.titre,
      };
    } else if (commentaire.actualite) {
      cible = {
        type: 'actualite',
        id: commentaire.actualite.id,
        titre: commentaire.actualite.title,
      };
    }

    return {
      id: commentaire.id,
      contenu: commentaire.contenu,
      createdAt: commentaire.createdAt,
      masque: commentaire.masque,
      auteur: {
        id: commentaire.user?.id ?? null,
        nom: commentaire.user?.fullname ?? null,
      },
      cible,
    };
  }

  /**
   * Calcule les statistiques d'engagement (likesCount, commentsCount, likedByMe)
   * pour une liste de cibles. Réutilisé par les services Signalement et Actualité
   * pour enrichir leurs réponses sans dupliquer la logique.
   *
   * @returns Map indexée par id de cible.
   */
  async getEngagementStats(
    target: EngagementTarget,
    targetIds: string[],
    userId?: string,
  ): Promise<Map<string, { likesCount: number; commentsCount: number; likedByMe: boolean }>> {
    const result = new Map<
      string,
      { likesCount: number; commentsCount: number; likedByMe: boolean }
    >();

    if (targetIds.length === 0) {
      return result;
    }

    const idField = target === 'signalement' ? 'signalementId' : 'actualiteId';
    const inFilter = { [idField]: { in: targetIds } } as any;
    // Les commentaires masqués ne sont pas comptabilisés dans commentsCount public.
    const commentFilter = { ...inFilter, masque: false } as any;

    targetIds.forEach((id) =>
      result.set(id, { likesCount: 0, commentsCount: 0, likedByMe: false }),
    );

    const [likeGroups, commentGroups, myLikes] = await Promise.all([
      this.prisma.reaction.groupBy({
        by: [idField as any],
        where: inFilter,
        _count: { _all: true },
      }),
      this.prisma.commentaire.groupBy({
        by: [idField as any],
        where: commentFilter,
        _count: { _all: true },
      }),
      userId
        ? this.prisma.reaction.findMany({
            where: { userId, ...inFilter },
            select: { [idField]: true } as any,
          })
        : Promise.resolve([] as any[]),
    ]);

    for (const g of likeGroups as any[]) {
      const id = g[idField];
      const entry = result.get(id);
      if (entry) entry.likesCount = g._count._all;
    }

    for (const g of commentGroups as any[]) {
      const id = g[idField];
      const entry = result.get(id);
      if (entry) entry.commentsCount = g._count._all;
    }

    for (const r of myLikes as any[]) {
      const id = r[idField];
      const entry = result.get(id);
      if (entry) entry.likedByMe = true;
    }

    return result;
  }
}
