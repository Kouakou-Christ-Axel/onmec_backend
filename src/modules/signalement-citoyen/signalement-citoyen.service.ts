import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSignalementCitoyenDto } from './dto/signalement-citoyen-dto/create-signalement-citoyen.dto';
import { UpdateSignalementCitoyenDto } from './dto/signalement-citoyen-dto/update-signalement-citoyen.dto';
import { SearchSignalementCitoyenDto } from './dto/signalement-citoyen-dto/search-signalement-citoyen.dto';
import { PrismaService } from '../../database/services/prisma.service';

@Injectable()
export class SignalementCitoyenService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSignalementCitoyenDto: CreateSignalementCitoyenDto) {
    return await this.prisma.signalementCitoyen.create({
      data: createSignalementCitoyenDto,
    });
  }

  async findAll(searchDto: SearchSignalementCitoyenDto) {
    const { titre, categorieId, statut, latitude, longitude, citoyenId } =
      searchDto;
    const where: any = {};

    if (titre) where.titre = { contains: titre, mode: 'insensitive' };
    if (categorieId) where.categorieId = categorieId;
    if (statut) where.statut = statut;
    if (latitude && longitude)
      where.latitude = latitude && where.longitude === longitude;
    if (citoyenId) where.citoyenId = citoyenId;

    return await this.prisma.signalementCitoyen.findMany({ where });
  }

  async findOne(id: string) {
    const signalement = await this.prisma.signalementCitoyen.findUnique({
      where: { id },
    });
    if (!signalement) {
      throw new NotFoundException(
        `Signalement citoyen avec l'id ${id} introuvable`,
      );
    }
    return signalement;
  }

  async update(
    id: string,
    updateSignalementCitoyenDto: UpdateSignalementCitoyenDto,
  ) {
    const { categorieId, statut } = updateSignalementCitoyenDto;
    const signalement = await this.prisma.signalementCitoyen.findUnique({
      where: { id },
    });
    if (!signalement) {
      throw new NotFoundException(
        `Signalement citoyen avec l'id ${id} introuvable`,
      );
    }
    return await this.prisma.signalementCitoyen.update({
      where: { id },
      data: {
        ...updateSignalementCitoyenDto,
        categorieId: categorieId ?? signalement.categorieId,
        statut: statut ?? signalement.statut,
      },
    });
  }

  async remove(id: string) {
    const signalement = await this.prisma.signalementCitoyen.findUnique({
      where: { id },
    });
    if (!signalement) {
      throw new NotFoundException(
        `Signalement citoyen avec l'id ${id} introuvable`,
      );
    }
    return await this.prisma.signalementCitoyen.delete({ where: { id } });
  }
}
