import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/services/prisma.service';
import slugify from '../../../../utils/slugify';
import { isPrismaError } from '../../../common/utils/prisma-error';
import { StatutActualite } from '../../../generated/prisma/client';
import {
  CategorieActualiteResponseDto,
  CreateCategorieActualiteDto,
  TagActualiteResponseDto,
  UpdateCategorieActualiteDto,
} from './dto/taxonomie.dto';

/**
 * Les compteurs affiches au public ne comptent que ce que le public peut
 * ouvrir : une categorie ne doit pas annoncer douze articles dont dix sont des
 * brouillons.
 */
const ACTUALITES_VISIBLES = {
  statut: StatutActualite.PUBLIEE,
  deletedAt: null,
};

@Injectable()
export class TaxonomieService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Categories -----------------------------------------------------------

  async createCategorie(
    dto: CreateCategorieActualiteDto,
  ): Promise<CategorieActualiteResponseDto> {
    const slug = slugify(dto.nom);
    if (!slug) {
      throw new BadRequestException(
        'Le nom de la catégorie ne produit aucun slug exploitable.',
      );
    }

    // Le slug reste unique y compris pour les categories retirees. Recreer une
    // categorie qu'on vient de supprimer aurait donc echoue definitivement en
    // 409, sans qu'aucune categorie ne soit visible nulle part -- on la
    // ressuscite plutot que de rendre son nom inutilisable a jamais.
    const retiree = await this.prisma.categorieActualite.findFirst({
      where: { slug, deletedAt: { not: null } },
    });

    if (retiree) {
      const revenue = await this.prisma.categorieActualite.update({
        where: { id: retiree.id },
        data: {
          nom: dto.nom.trim(),
          description: dto.description ?? null,
          deletedAt: null,
        },
        include: {
          _count: { select: { actualites: { where: ACTUALITES_VISIBLES } } },
        },
      });
      return {
        id: revenue.id,
        nom: revenue.nom,
        slug: revenue.slug,
        description: revenue.description,
        actualitesCount: revenue._count.actualites,
      };
    }

    try {
      const categorie = await this.prisma.categorieActualite.create({
        data: { nom: dto.nom.trim(), slug, description: dto.description },
      });
      return { ...categorie, actualitesCount: 0 };
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          `Une catégorie portant le slug « ${slug} » existe déjà.`,
        );
      }
      throw error;
    }
  }

  async findAllCategories(): Promise<CategorieActualiteResponseDto[]> {
    const categories = await this.prisma.categorieActualite.findMany({
      where: { deletedAt: null },
      orderBy: { nom: 'asc' },
      include: { _count: { select: { actualites: { where: ACTUALITES_VISIBLES } } } },
    });

    return categories.map((c) => ({
      id: c.id,
      nom: c.nom,
      slug: c.slug,
      description: c.description,
      actualitesCount: c._count.actualites,
    }));
  }

  private async assertCategorieExists(id: string) {
    const categorie = await this.prisma.categorieActualite.findFirst({
      where: { id, deletedAt: null },
    });
    if (!categorie) {
      throw new NotFoundException(`Catégorie avec l'id ${id} introuvable`);
    }
    return categorie;
  }

  async updateCategorie(
    id: string,
    dto: UpdateCategorieActualiteDto,
  ): Promise<CategorieActualiteResponseDto> {
    await this.assertCategorieExists(id);

    const categorie = await this.prisma.categorieActualite.update({
      where: { id },
      data: {
        ...(dto.nom !== undefined && { nom: dto.nom.trim() }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: { _count: { select: { actualites: { where: ACTUALITES_VISIBLES } } } },
    });

    return {
      id: categorie.id,
      nom: categorie.nom,
      slug: categorie.slug,
      description: categorie.description,
      actualitesCount: categorie._count.actualites,
    };
  }

  /**
   * Suppression reversible.
   *
   * La relation porte `onDelete: SetNull` : une suppression definitive
   * declasserait silencieusement les actualites concernees. Le soft-delete
   * retire la categorie des listes sans toucher a ce qu'elle classe, et laisse
   * la possibilite de revenir en arriere.
   */
  async removeCategorie(id: string): Promise<void> {
    await this.assertCategorieExists(id);
    await this.prisma.categorieActualite.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- Tags -----------------------------------------------------------------

  /**
   * Les tags sont crees a la redaction, jamais depuis une interface dediee :
   * seules la lecture et la purge sont exposees.
   */
  async findAllTags(): Promise<TagActualiteResponseDto[]> {
    const tags = await this.prisma.tagActualite.findMany({
      orderBy: { nom: 'asc' },
      include: { _count: { select: { actualites: { where: ACTUALITES_VISIBLES } } } },
    });

    return tags.map((t) => ({
      id: t.id,
      nom: t.nom,
      slug: t.slug,
      actualitesCount: t._count.actualites,
    }));
  }

  /**
   * Supprime un tag et les rattachements correspondants.
   *
   * Sert au menage : les tags etant libres, une faute de frappe a la redaction
   * cree un tag parasite qu'il faut pouvoir retirer. Aucune actualite n'est
   * perdue, seul le lien disparait.
   */
  async removeTag(id: string): Promise<void> {
    const tag = await this.prisma.tagActualite.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag avec l'id ${id} introuvable`);
    }
    await this.prisma.tagActualite.delete({ where: { id } });
  }
}
