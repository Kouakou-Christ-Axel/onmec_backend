import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/services/prisma.service';
import { HashService } from 'src/common/services/hash.service';
import { GenerateDataService } from 'src/common/services/generate-data.service';
import { AdminRole, Prisma } from '../../generated/prisma/client';
import { AuthenticatedActor } from 'src/common/types/authenticated-actor';
import {
  CreateAdminDto,
  SearchAdminDto,
  UpdateAdminDto,
  UpdateAdminStatutDto,
} from './dto/admin.dto';

/** Ni `password` ni `otpSecret` ne sortent jamais de ce service. */
const ADMIN_PUBLIC_SELECT = {
  id: true,
  fullname: true,
  email: true,
  phone: true,
  role: true,
  avatar: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

@Injectable()
export class AdminsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
    private readonly generateDataService: GenerateDataService,
  ) {}

  /**
   * Cree un compte back-office.
   * Le mot de passe genere n'est retourne qu'une fois, et devra etre change
   * a la premiere connexion (`mustChangePassword`).
   */
  async create(dto: CreateAdminDto) {
    const exists = await this.prisma.admin.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (exists) {
      throw new ConflictException('Un compte back-office existe déjà avec cet email');
    }

    const plainPassword = this.generateDataService.generateSecurePassword();

    const admin = await this.prisma.admin.create({
      data: {
        ...dto,
        password: await this.hashService.hash(plainPassword),
        mustChangePassword: true,
      },
      select: ADMIN_PUBLIC_SELECT,
    });

    return { ...admin, password: plainPassword };
  }

  async findAll(query: SearchAdminDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.AdminWhereInput = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { fullname: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role) {
      where.role = query.role;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.admin.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        select: ADMIN_PUBLIC_SELECT,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.admin.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findOne(id: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      select: ADMIN_PUBLIC_SELECT,
    });
    if (!admin) {
      throw new NotFoundException('Compte administrateur non trouvé');
    }
    return admin;
  }

  async update(id: string, dto: UpdateAdminDto, actor: AuthenticatedActor) {
    await this.assertExists(id);

    // Empeche un administrateur national de se retrograder lui-meme : ce serait
    // la seule action irreversible sans passer par la base.
    if (id === actor.id && dto.role && dto.role !== AdminRole.ADMIN_NATIONAL) {
      throw new BadRequestException(
        'Vous ne pouvez pas modifier votre propre rôle.',
      );
    }

    if (dto.role && dto.role !== AdminRole.ADMIN_NATIONAL) {
      await this.assertNotLastNationalAdmin(id);
    }

    return this.prisma.admin.update({
      where: { id },
      data: dto,
      select: ADMIN_PUBLIC_SELECT,
    });
  }

  async setActive(
    id: string,
    dto: UpdateAdminStatutDto,
    actor: AuthenticatedActor,
  ) {
    await this.assertExists(id);

    if (id === actor.id && !dto.isActive) {
      throw new BadRequestException(
        'Vous ne pouvez pas désactiver votre propre compte.',
      );
    }
    if (!dto.isActive) {
      await this.assertNotLastNationalAdmin(id);
    }

    return this.prisma.admin.update({
      where: { id },
      data: { isActive: dto.isActive },
      select: ADMIN_PUBLIC_SELECT,
    });
  }

  /** Genere un mot de passe temporaire et force son changement. */
  async resetPassword(id: string) {
    await this.assertExists(id);

    const plainPassword = this.generateDataService.generateSecurePassword();

    const admin = await this.prisma.admin.update({
      where: { id },
      data: {
        password: await this.hashService.hash(plainPassword),
        mustChangePassword: true,
        otpSecret: null,
        otpPurpose: null,
        otpExpiresAt: null,
      },
      select: { email: true },
    });

    return { email: admin.email, password: plainPassword };
  }

  /** Suppression logique : conserve la tracabilite des contenus publies. */
  async remove(id: string, actor: AuthenticatedActor) {
    await this.assertExists(id);

    if (id === actor.id) {
      throw new BadRequestException(
        'Vous ne pouvez pas supprimer votre propre compte.',
      );
    }
    await this.assertNotLastNationalAdmin(id);

    return this.prisma.admin.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: ADMIN_PUBLIC_SELECT,
    });
  }

  private async assertExists(id: string) {
    const exists = await this.prisma.admin.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Compte administrateur non trouvé');
    }
  }

  /**
   * Empeche de retirer le dernier administrateur national actif : sans lui,
   * plus personne ne peut creer ou promouvoir un admin, et le back-office
   * devient definitivement inadministrable.
   */
  private async assertNotLastNationalAdmin(id: string) {
    const target = await this.prisma.admin.findUnique({
      where: { id },
      select: { role: true },
    });
    if (target?.role !== AdminRole.ADMIN_NATIONAL) return;

    const remaining = await this.prisma.admin.count({
      where: {
        role: AdminRole.ADMIN_NATIONAL,
        isActive: true,
        deletedAt: null,
        id: { not: id },
      },
    });

    if (remaining === 0) {
      throw new BadRequestException(
        'Impossible : ce compte est le dernier administrateur national actif.',
      );
    }
  }
}
