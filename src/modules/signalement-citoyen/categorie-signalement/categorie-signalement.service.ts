import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/services/prisma.service';
import { CreateCategorieSignalementDto } from '../dto/categorie-signalement-dto/create-categorie-signalement.dto';
import { UpdateCategorieSignalementDto } from '../dto/categorie-signalement-dto/update-categorie-signalement.dto';

@Injectable()
export class CategorieSignalementService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategorieSignalementDto: CreateCategorieSignalementDto) {
    return await this.prisma.categorieSignalement.create({
      data: createCategorieSignalementDto,
    });
  }

  async findAll() {
    return await this.prisma.categorieSignalement.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: { signalements: true },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.getOrThrow(id, true);
  }

  async update(id: string, updateCategorieSignalementDto: UpdateCategorieSignalementDto) {
    await this.getOrThrow(id);

    return await this.prisma.categorieSignalement.update({
      where: { id },
      data: updateCategorieSignalementDto,
    });
  }

  async remove(id: string) {
    await this.getOrThrow(id);

    // Soft delete
    return await this.prisma.categorieSignalement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Récupère une catégorie non supprimée ou lève 404 — factorise la relecture
   * répétée par `findOne`, `update` et `remove`.
   *
   * @param avecCompteur - Inclut `_count.signalements`, nécessaire uniquement
   *   à la réponse détaillée de `findOne`.
   */
  private async getOrThrow(id: string, avecCompteur = false) {
    const categorie = await this.prisma.categorieSignalement.findUnique({
      where: { id },
      include: avecCompteur ? { _count: { select: { signalements: true } } } : undefined,
    });

    if (!categorie || categorie.deletedAt) {
      throw new NotFoundException(`Catégorie de signalement avec l'id ${id} introuvable`);
    }

    return categorie;
  }
}
