import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { extname } from 'path';
import { CreateActualiteDto } from './dto/create-actualite.dto';
import { UpdateActualiteDto } from './dto/update-actualite.dto';
import { UploadImageResponseDto } from './dto/upload-image.dto';
import { PrismaService } from 'src/database/services/prisma.service';
import slugify from '../../../utils/slugify';
import { ActualitesSearchDto } from './dto/actualites-search.dto';
import { Prisma, StatutActualite } from '../../generated/prisma/client';
import { ActualiteEntity } from './entities/actualite.entity';
import { EngagementService } from '../engagement/engagement.service';
import {
  NOTIFICATION_TYPE,
  NotificationService,
} from '../notification/notification.service';
import {
  AuthenticatedActor,
  isAdminActor,
} from 'src/common/types/authenticated-actor';
import { AdminRole } from '../../generated/prisma/client';
import { R2StorageService } from 'src/common/services/r2-storage.service';

/** Rôles autorisés à voir et manipuler les brouillons. */
const EDITORIAL_ROLES: string[] = [
  AdminRole.ADMIN_NATIONAL,
  AdminRole.CHARGE_COMMUNICATION,
];

/** Durée de validité des URL présignées d'upload, en secondes. */

/** Borne du prefiltre de recherche plein texte. */
const SEARCH_ID_LIMIT = 500;

/** Auteur exposé dans les réponses. Jamais l'objet Admin complet. */
const AUTHOR_SELECT = {
  select: { id: true, fullname: true, role: true },
} as const;

/**
 * Relations jointes a toute lecture d'actualite.
 *
 * Regroupees ici parce qu'elles doivent etre identiques partout : une reponse
 * de POST ou de PATCH qui n'exposerait pas la categorie et les tags, alors que
 * les GET le font, obligerait le front a recharger apres chaque ecriture.
 */
const ACTUALITE_INCLUDE = {
  author: AUTHOR_SELECT,
  categorie: { select: { id: true, nom: true, slug: true } },
  tags: { select: { id: true, nom: true, slug: true } },
} as const;

@Injectable()
export class ActualitesService {
  private readonly logger = new Logger(ActualitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engagementService: EngagementService,
    private readonly notifications: NotificationService,
    private readonly r2Service: R2StorageService,
  ) {}

  /**
   * Filtre de visibilité.
   *
   * Un membre ou un visiteur anonyme ne voit que les actualités publiées et
   * non supprimées. Les rôles éditoriaux voient tout, y compris les brouillons,
   * pour pouvoir prévisualiser avant publication.
   */
  private visibilityFilter(
    actor?: AuthenticatedActor,
  ): Prisma.ActualiteWhereInput {
    const canSeeDrafts =
      isAdminActor(actor) && EDITORIAL_ROLES.includes(actor.role);

    return canSeeDrafts
      ? { deletedAt: null }
      : { deletedAt: null, statut: StatutActualite.PUBLIEE };
  }

  /**
   * Recherche plein texte : renvoie les identifiants correspondants.
   *
   * Le filtre `search` de Prisma est inutilisable ici pour deux raisons,
   * constatees en journalisant le SQL reellement emis :
   *
   * 1. Il transmet la saisie telle quelle a `to_tsquery`, dont la syntaxe
   *    attend des operateurs explicites — une recherche banale comme
   *    « nouveau pont » produisait une erreur de syntaxe, donc un 500.
   * 2. Il genere `to_tsvector(concat_ws(...))`, la forme A UN ARGUMENT, qui
   *    depend du GUC `default_text_search_config`. Elle est STABLE et non
   *    IMMUTABLE : Postgres refuse de l'indexer, donc la requete faisait un
   *    seq scan en recalculant le vecteur sur chaque ligne, quel que soit
   *    l'index pose.
   *
   * On passe donc par une requete brute qui reprend exactement l'expression
   * indexee (voir la migration actualites_fts_index) et utilise
   * `websearch_to_tsquery`, lequel accepte une saisie libre sans jamais lever
   * d'erreur de syntaxe — ce qui rend tout assainissement prealable inutile.
   *
   * La liste est bornee a SEARCH_ID_LIMIT : au-dela, l'utilisateur doit
   * affiner sa recherche plutot que de faire transiter un IN gigantesque.
   * La troncature est journalisee, car elle rend `meta.total` approximatif
   * et vide les pages profondes — elle ne doit pas passer inapercue.
   */
  private async searchMatchingIds(raw: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
        FROM actualites
       WHERE to_tsvector(
               'french',
               coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '')
             ) @@ websearch_to_tsquery('french', ${raw})
       LIMIT ${SEARCH_ID_LIMIT}
    `;
    if (rows.length === SEARCH_ID_LIMIT) {
      this.logger.warn(
        `Recherche « ${raw} » tronquee a ${SEARCH_ID_LIMIT} resultats : ` +
          'le total et les pages profondes sont incomplets.',
      );
    }

    return rows.map((r) => r.id);
  }

  /**
   * Génère un slug unique. La boucle n'est pas atomique : deux créations
   * simultanées du même titre peuvent produire le même slug, d'où le
   * rattrapage de P2002 sur create/update.
   */
  private async generateUniqueSlug(
    title: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = slugify(title);

    let existing = await this.prisma.actualite.findUnique({ where: { slug } });

    while (existing && existing.id !== excludeId) {
      const randomSuffix = `-${Math.random().toString(36).substring(2, 8)}`;
      slug = slugify(title, randomSuffix);
      existing = await this.prisma.actualite.findUnique({ where: { slug } });
    }

    return slug;
  }

  private isSlugConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  /**
   * Traduit une liste de noms de tags en instruction de rattachement Prisma.
   *
   * Les tags sont libres : le redacteur saisit des noms, pas des identifiants.
   * `connectOrCreate` sur le slug reutilise le tag s'il existe deja, ce qui
   * evite « Sante » et « sante » en double, et le cree sinon.
   *
   * Retourne `undefined` quand le champ est absent — distinct d'un tableau
   * vide, qui signifie « retirer tous les tags ».
   */
  private tagsInput(tags?: string[]) {
    if (tags === undefined) return undefined;

    // Deduplication par slug : « Sante » et « sante  » saisis ensemble
    // produiraient deux fois le meme connectOrCreate, que Prisma refuse.
    const parSlug = new Map<string, string>();
    for (const nom of tags) {
      const propre = nom.trim();
      const slug = slugify(propre);
      if (slug && !parSlug.has(slug)) parSlug.set(slug, propre);
    }

    return {
      connectOrCreate: [...parSlug].map(([slug, nom]) => ({
        where: { slug },
        create: { slug, nom },
      })),
    };
  }

  /**
   * Refuse une `imageKey` qui ne pointe pas vers une couverture.
   *
   * Sans ce garde-fou, un client pourrait réutiliser par erreur une clé
   * générée pour le corps d'un article (`actualites/contenu/...`), ou
   * fournir une valeur arbitraire n'importe où dans le bucket.
   */
  private assertCoverImageKey(imageKey?: string) {
    if (imageKey === undefined) return;
    if (
      !imageKey.startsWith('actualites/') ||
      imageKey.startsWith('actualites/contenu/')
    ) {
      throw new BadRequestException(
        "imageKey doit être une clé de couverture générée par POST /actualites/upload-url",
      );
    }
  }

  async create(
    createActualiteDto: CreateActualiteDto,
    author: AuthenticatedActor,
  ) {
    this.assertCoverImageKey(createActualiteDto.imageKey);
    const imageUrl = createActualiteDto.imageKey ?? null;
    // `tags` est une liste de noms, pas une colonne : il ne peut pas etre
    // repandu tel quel dans `data`. `imageKey` non plus : la colonne
    // s'appelle `imageUrl` et porte desormais la cle R2, pas un chemin.
    const { tags, imageKey: _imageKey, ...champs } = createActualiteDto;

    const write = async () => {
      const slug = await this.generateUniqueSlug(createActualiteDto.title);
      return this.prisma.actualite.create({
        data: {
          ...champs,
          slug,
          imageUrl,
          // Toujours dérivé du token : jamais accepté depuis le corps de requête.
          authorId: author.id,
          tags: this.tagsInput(tags),
        },
        include: ACTUALITE_INCLUDE,
      });
    };

    let created;
    try {
      created = await write();
    } catch (error) {
      if (!this.isSlugConflict(error)) throw error;
      created = await write();
    }

    // Passe par mapToEntity : la version précédente retournait la ligne brute,
    // donc une imageUrl sans préfixe CDN, incohérente avec celle des GET.
    // Les compteurs d'engagement sont ajoutés pour que la forme de la réponse
    // soit identique à celle des lectures — ils valent zéro par construction.
    return {
      ...this.mapToEntity(created),
      likesCount: 0,
      commentsCount: 0,
      likedByMe: false,
    };
  }

  async findAll(
    query?: ActualitesSearchDto,
    actor?: AuthenticatedActor,
    statutFilter?: StatutActualite,
  ) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ActualiteWhereInput = this.visibilityFilter(actor);

    if (statutFilter) {
      where.statut = statutFilter;
    }

    const rawSearch = query?.search?.trim();
    if (rawSearch) {
      const ids = await this.searchMatchingIds(rawSearch);
      // Aucun resultat : on force un ensemble vide plutot que d'ignorer le
      // filtre, ce qui retournerait toutes les actualites.
      where.id = { in: ids };
    }

    if (query?.dateFrom || query?.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = new Date(query.dateFrom);
      if (query.dateTo) where.date.lte = new Date(query.dateTo);
    }

    if (query?.hasImage !== undefined) {
      where.imageUrl = query.hasImage ? { not: null } : null;
    }

    // Filtrage par slug et non par identifiant : les URL du front restent
    // lisibles et survivent a une reconstruction de la base.
    if (query?.categorie) {
      where.categorie = { slug: query.categorie };
    }

    // Semantique OU : une actualite portant au moins un des tags demandes
    // ressort. C'est la lecture attendue d'une liste de tags sur un site
    // d'actualites -- un ET renverrait presque toujours vide.
    if (query?.tags?.length) {
      where.tags = { some: { slug: { in: query.tags } } };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.actualite.findMany({
        where,
        orderBy: { date: 'desc' },
        include: ACTUALITE_INCLUDE,
        skip,
        take: limit,
      }),
      this.prisma.actualite.count({ where }),
    ]);

    const stats = await this.engagementService.getEngagementStats(
      'actualite',
      data.map((item) => item.id),
      actor?.type === 'member' ? actor.id : undefined,
    );

    const mappedData = data.map((item) => ({
      ...this.mapToEntity(item),
      ...(stats.get(item.id) ?? {
        likesCount: 0,
        commentsCount: 0,
        likedByMe: false,
      }),
    }));

    return {
      data: mappedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string, actor?: AuthenticatedActor) {
    const actualite = await this.prisma.actualite.findFirst({
      where: { id, ...this.visibilityFilter(actor) },
      include: ACTUALITE_INCLUDE,
    });

    // 404 et non 403 : un brouillon ne doit pas révéler son existence.
    if (!actualite) {
      throw new NotFoundException(`Actualité avec l'ID ${id} non trouvée`);
    }

    return this.withEngagement(this.mapToEntity(actualite), actualite.id, actor);
  }

  async findBySlug(slug: string, actor?: AuthenticatedActor) {
    const actualite = await this.prisma.actualite.findFirst({
      where: { slug, ...this.visibilityFilter(actor) },
      include: ACTUALITE_INCLUDE,
    });

    if (!actualite) {
      throw new NotFoundException(`Actualité avec le slug ${slug} non trouvée`);
    }

    return this.withEngagement(this.mapToEntity(actualite), actualite.id, actor);
  }

  private async withEngagement(
    actualite: ActualiteEntity,
    id: string,
    actor?: AuthenticatedActor,
  ) {
    const stats = await this.engagementService.getEngagementStats(
      'actualite',
      [id],
      actor?.type === 'member' ? actor.id : undefined,
    );
    const entry = stats.get(id) ?? {
      likesCount: 0,
      commentsCount: 0,
      likedByMe: false,
    };
    return { ...actualite, ...entry };
  }

  async update(id: string, updateActualiteDto: UpdateActualiteDto) {
    this.assertCoverImageKey(updateActualiteDto.imageKey);
    const actualite = await this.assertExists(id);

    const { tags, categorieId, imageKey, ...champs } = updateActualiteDto;
    const updateData: Prisma.ActualiteUpdateInput = { ...champs };

    if (categorieId !== undefined) {
      updateData.categorie = { connect: { id: categorieId } };
    }

    if (tags !== undefined) {
      // Remplacement et non ajout : `set: []` detache d'abord l'existant, sans
      // quoi un tag retire a la redaction resterait attache indefiniment.
      updateData.tags = { set: [], ...this.tagsInput(tags) };
    }

    if (imageKey !== undefined) {
      updateData.imageUrl = imageKey;
    }

    if (updateActualiteDto.title) {
      updateData.slug = await this.generateUniqueSlug(
        updateActualiteDto.title,
        id,
      );
    }

    const updated = await this.prisma.actualite.update({
      where: { id },
      data: updateData,
      include: ACTUALITE_INCLUDE,
    });

    // L'ancien objet R2 n'etait jamais supprime : chaque remplacement d'image
    // laissait un orphelin definitif dans le bucket.
    if (imageKey !== undefined && actualite.imageUrl) {
      await this.deleteR2Object(actualite.imageUrl);
    }

    return this.withEngagement(this.mapToEntity(updated), updated.id);
  }

  /** Publie une actualité. `publishedAt` n'est posé qu'à la première publication. */
  async publier(id: string) {
    const actualite = await this.assertExists(id);

    // La notification est adossée à la PREMIÈRE publication, pas à l'appel.
    // `publier` est idempotent : republier une actualité déjà publiée est un
    // no-op qui renvoie 200, et notifier sur l'appel aurait donc prévenu tous
    // les membres autant de fois que le bouton est cliqué. Adosser la
    // diffusion à `publishedAt` la rend insensible aussi au cycle
    // dépublier/republier, qui corrige une erreur plutôt qu'il n'annonce une
    // nouveauté.
    const premierePublication = actualite.publishedAt === null;

    const updated = await this.prisma.actualite.update({
      where: { id },
      data: {
        statut: StatutActualite.PUBLIEE,
        publishedAt: actualite.publishedAt ?? new Date(),
      },
      include: ACTUALITE_INCLUDE,
    });

    if (premierePublication) {
      await this.notifications.diffuserATousLesMembres({
        type: NOTIFICATION_TYPE.ACTUALITE_PUBLIEE,
        title: 'Nouvelle actualité',
        body: updated.title,
        lien: `/actualites/${updated.slug}`,
      });
    }

    return this.withEngagement(this.mapToEntity(updated), updated.id);
  }

  /** Retire une actualité de la diffusion publique, sans perdre son contenu. */
  async depublier(id: string) {
    await this.assertExists(id);

    const updated = await this.prisma.actualite.update({
      where: { id },
      data: { statut: StatutActualite.BROUILLON },
      include: ACTUALITE_INCLUDE,
    });

    return this.withEngagement(this.mapToEntity(updated), updated.id);
  }

  /**
   * Suppression réversible.
   *
   * L'ancienne version faisait un `delete` qui cascadait sur `reactions` et
   * `commentaires` : une suppression accidentelle détruisait définitivement
   * tout l'engagement des lecteurs.
   */
  async remove(id: string) {
    await this.assertExists(id);

    const updated = await this.prisma.actualite.update({
      where: { id },
      data: { deletedAt: new Date(), statut: StatutActualite.ARCHIVEE },
      include: ACTUALITE_INCLUDE,
    });

    return this.withEngagement(this.mapToEntity(updated), updated.id);
  }

  async restore(id: string) {
    const actualite = await this.prisma.actualite.findUnique({ where: { id } });

    if (!actualite) {
      throw new NotFoundException(`Actualité avec l'ID ${id} non trouvée`);
    }

    const updated = await this.prisma.actualite.update({
      where: { id },
      data: { deletedAt: null, statut: StatutActualite.BROUILLON },
      include: ACTUALITE_INCLUDE,
    });

    return this.withEngagement(this.mapToEntity(updated), updated.id);
  }

  /** Existence côté back-office : ignore le statut, respecte le soft-delete. */
  private async assertExists(id: string) {
    const actualite = await this.prisma.actualite.findFirst({
      where: { id, deletedAt: null },
    });

    if (!actualite) {
      throw new NotFoundException(`Actualité avec l'ID ${id} non trouvée`);
    }

    return actualite;
  }

  /**
   * Extrait la clé objet R2 depuis la valeur stockée en base.
   *
   * Les lignes migrées avant le script de migration `/uploads` -> R2 portent
   * encore un chemin `/uploads/actualites/...` ; les nouvelles portent
   * directement la clé. Les deux formes sont acceptées le temps de la
   * transition.
   */
  private extractImageKey(imageUrl: string): string {
    return imageUrl.replace(/^\/?uploads\//, '');
  }

  /** Suppression best-effort : l'échec ne doit pas faire échouer la requête. */
  private async deleteR2Object(imageUrl: string) {
    try {
      await this.r2Service.delete(this.extractImageKey(imageUrl));
    } catch (error) {
      this.logger.warn(
        `Impossible de supprimer l'objet R2 ${imageUrl}: ${(error as Error).message}`,
      );
    }
  }

  private mapToEntity(actualite: any): ActualiteEntity {
    const entity = new ActualiteEntity();
    Object.assign(entity, actualite);
    return this.addPublicUrl(entity);
  }

  private addPublicUrl(actualite: ActualiteEntity) {
    if (!actualite.imageUrl) return actualite;
    return {
      ...actualite,
      imageUrl: this.r2Service.getPublicUrl(actualite.imageUrl),
    };
  }

  /**
   * Génère une URL présignée pour une image, sous le préfixe de dossier donné.
   *
   * Partagée par les deux flux d'upload d'actualités : couverture
   * (`actualites/`) et corps d'article (`actualites/contenu/`), seul le
   * préfixe change. Pas de finalisation séparée : une fois le PUT réussi, le
   * client construit lui-même l'URL publique depuis la clé.
   */
  /** Image du corps d'un article, distincte de la couverture. */
  buildContentImageUrl(
    filename: string,
    contentType: string,
  ): Promise<UploadImageResponseDto> {
    return this.r2Service.presignImage(
      'actualites/contenu',
      filename,
      contentType,
    );
  }

  /** Image de couverture d'une actualité. */
  buildCoverImageUrl(
    filename: string,
    contentType: string,
  ): Promise<UploadImageResponseDto> {
    return this.r2Service.presignImage('actualites', filename, contentType);
  }
}
