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
    const categorie = await this.prisma.categorieSignalement.findUnique({
      where: { id },
      include: {
        _count: {
          select: { signalements: true },
        },
      },
    });

    if (!categorie || categorie.deletedAt) {
      throw new NotFoundException(`Catégorie de signalement avec l'id ${id} introuvable`);
    }

    return categorie;
  }

  async update(id: string, updateCategorieSignalementDto: UpdateCategorieSignalementDto) {
    const categorie = await this.prisma.categorieSignalement.findUnique({ where: { id } });

    if (!categorie || categorie.deletedAt) {
      throw new NotFoundException(`Catégorie de signalement avec l'id ${id} introuvable`);
    }

    return await this.prisma.categorieSignalement.update({
      where: { id },
      data: updateCategorieSignalementDto,
    });
  }

  async remove(id: string) {
    const categorie = await this.prisma.categorieSignalement.findUnique({ where: { id } });

    if (!categorie || categorie.deletedAt) {
      throw new NotFoundException(`Catégorie de signalement avec l'id ${id} introuvable`);
    }

    // Soft delete
    return await this.prisma.categorieSignalement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
