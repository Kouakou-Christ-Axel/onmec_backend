import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/services/prisma.service';
import { PushService } from './push.service';
import { StatutMembre } from '../../generated/prisma/client';
import {
  NotificationListQueryDto,
  NotificationResponseDto,
  PaginatedNotificationsDto,
} from './dto/notification.dto';

/**
 * Valeurs emises dans `Notification.type`.
 *
 * Contrat avec le front : il s'en sert pour choisir une icone et une action.
 * `type` reste une colonne texte cote base (voir le commentaire du modele),
 * cette constante en est la source de verite applicative.
 */
export const NOTIFICATION_TYPE = {
  ACTUALITE_PUBLIEE: 'actualite_publiee',
  SIGNALEMENT_STATUT: 'signalement_statut',
  SIGNALEMENT_COMMENTAIRE: 'signalement_commentaire',
  COMMENTAIRE_MODERE: 'commentaire_modere',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

/** Firebase refuse un multicast au-dela de 500 jetons. */
const TAILLE_LOT_PUSH = 500;

/** Bornes du fil : au-dela, l'application mobile pagine. */
const LIMITE_PAR_DEFAUT = 20;

interface Contenu {
  type: NotificationType;
  title: string;
  body: string;
  lien?: string;
}

/** Champs exposés au client : select Prisma partagé, la ligne est déjà le DTO. */
const NOTIFICATION_SELECT = {
  id: true,
  title: true,
  body: true,
  type: true,
  lien: true,
  isRead: true,
  readAt: true,
  createdAt: true,
} as const;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  // --- Emission -------------------------------------------------------------

  /**
   * Notifie un membre : une ligne dans son fil, puis une push sur ses appareils.
   *
   * L'attente s'arrete a l'ecriture en base. La push part ensuite sans etre
   * attendue : elle depend de Firebase et du reseau, et l'action qui a
   * declenche la notification (publication, changement de statut, moderation)
   * est deja enregistree — la faire echouer parce qu'un jeton d'appareil est
   * perime serait absurde.
   */
  async notifierMembre(userId: string, contenu: Contenu): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type: contenu.type,
          title: contenu.title,
          body: contenu.body,
          lien: contenu.lien,
        },
      });
    } catch (error) {
      this.logger.error(
        `Echec de l'ecriture de la notification ${contenu.type} pour le membre ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    void this.pousserVersMembre(userId, contenu);
  }

  /**
   * Notifie tous les membres actifs. Utilise a la publication d'une actualite.
   *
   * `createMany` en une instruction plutot qu'une boucle : sur une base de
   * plusieurs milliers de membres, la difference n'est pas cosmetique.
   */
  async diffuserATousLesMembres(contenu: Contenu): Promise<number> {
    const membres = await this.prisma.member.findMany({
      where: { deletedAt: null, statut: StatutMembre.ACTIF },
      select: { id: true },
    });

    if (membres.length === 0) return 0;

    try {
      await this.prisma.notification.createMany({
        data: membres.map((m) => ({
          userId: m.id,
          type: contenu.type,
          title: contenu.title,
          body: contenu.body,
          lien: contenu.lien,
        })),
      });
    } catch (error) {
      this.logger.error(
        `Echec de la diffusion ${contenu.type} a ${membres.length} membres`,
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }

    void this.pousserVersTous(contenu);

    return membres.length;
  }

  // --- Push (jamais attendue par l'appelant) --------------------------------

  private async pousserVersMembre(
    userId: string,
    contenu: Contenu,
  ): Promise<void> {
    try {
      const appareils = await this.prisma.deviceToken.findMany({
        where: { userId },
        select: { token: true },
      });
      await this.pousser(
        appareils.map((a) => a.token),
        contenu,
      );
    } catch (error) {
      this.logger.warn(
        `Push non delivree au membre ${userId} : ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async pousserVersTous(contenu: Contenu): Promise<void> {
    try {
      // Seuls les appareils rattaches a un membre : un jeton anonyme ne peut
      // pas etre relie a un fil, le notifier serait incoherent.
      const appareils = await this.prisma.deviceToken.findMany({
        where: { userId: { not: null } },
        select: { token: true },
      });
      await this.pousser(
        appareils.map((a) => a.token),
        contenu,
      );
    } catch (error) {
      this.logger.warn(
        `Diffusion push non delivree : ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async pousser(tokens: string[], contenu: Contenu): Promise<void> {
    for (let i = 0; i < tokens.length; i += TAILLE_LOT_PUSH) {
      const lot = tokens.slice(i, i + TAILLE_LOT_PUSH);
      await this.push.sendNotificationToMultipleTokens({
        tokens: lot,
        title: contenu.title,
        body: contenu.body,
        icon: '',
      });
    }
  }

  // --- Fil ------------------------------------------------------------------

  async lister(
    userId: string,
    query: NotificationListQueryDto,
  ): Promise<PaginatedNotificationsDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? LIMITE_PAR_DEFAUT;

    const where = {
      userId,
      ...(query.nonLues ? { isRead: false } : {}),
    };

    const [total, notifications, nonLues] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        select: NOTIFICATION_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data: notifications,
      total,
      page,
      limit,
      nonLues,
    };
  }

  async compterNonLues(userId: string): Promise<{ nonLues: number }> {
    const nonLues = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { nonLues };
  }

  /**
   * Marque une notification comme lue.
   *
   * Le `userId` fait partie du filtre de mise a jour et non d'une verification
   * prealable : un membre ne peut donc pas marquer lue la notification d'un
   * autre, et l'absence de ligne touchee vaut 404.
   */
  async marquerLue(
    userId: string,
    id: string,
  ): Promise<NotificationResponseDto> {
    // Aucune ligne touchee signifie soit « deja lue », soit « pas la sienne » :
    // la relecture qui suit tranche, et l'operation reste idempotente dans le
    // premier cas.
    await this.prisma.notification.updateMany({
      where: { id, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
      select: NOTIFICATION_SELECT,
    });

    if (!notification) {
      throw new NotFoundException(`Notification avec l'id ${id} introuvable`);
    }

    return notification;
  }

  async marquerToutesLues(userId: string): Promise<{ marquees: number }> {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { marquees: count };
  }
}
