import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateUserDto } from '../dto/create-user.dto';
import { Prisma, User, UserRole } from '@prisma/client';
import { SearchUserDto } from '../dto/search-user.dto';
import { Request } from 'express';
import { PrismaService } from 'src/database/services/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateUserPasswordDto } from '../dto/update-user-password.dto';
import { GenerateDataService } from 'src/common/services/generate-data.service';
import { ResetUserPasswordResponseDto } from '../dto/reset-user-password.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generateDataService: GenerateDataService,
  ) {}

  // CREATE
  async create(req: Request, createUserDto: CreateUserDto) {
    const { pass, hash } = await this.prepareNewUserCredentials(
      req,
      createUserDto,
    );

    // Créer l'utilisateur (le rôle fourni est respecté, MEMBER par défaut)
    const newUser = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hash,
        role: createUserDto.role ?? UserRole.MEMBER,
      },
    });

    const { password, ...rest } = newUser;
    return { ...rest, password: pass };
  }

  private async prepareNewUserCredentials(
    req: Request,
    createUserDto: CreateUserDto,
  ) {
    const user = req.user as User;
    // Vérification de l'existence de l'utilisateur
    const userExist = await this.prisma.user.findUnique({
      where: {
        email: createUserDto.email,
      },
    });
    if (userExist) {
      throw new BadRequestException(
        "Utilisateur déjà existant, changer d'email",
      );
    }

    // Générer le salt et le hash
    const pass = this.generateDataService.generateSecurePassword();
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(pass, salt);
    return { pass, hash, user };
  }

  // CREATE MEMBER
  async createMember(req: Request, createUserDto: CreateUserDto) {
    const { pass, hash } = await this.prepareNewUserCredentials(
      req,
      createUserDto,
    );

    // Créer l'utilisateur
    const newUser = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hash,
        role: UserRole.MEMBER,
      },
    });

    const { password, ...rest } = newUser;
    return { ...rest, password: pass };
  }

  // FIND_ALL (paginé + filtres)
  async findAll(query: SearchUserDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      where.OR = [
        { fullname: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.status === 'ACTIVE') {
      where.deletedAt = null;
    } else if (query.status === 'INACTIVE') {
      where.deletedAt = { not: null };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: Object.keys(where).length ? where : undefined,
        orderBy: { updatedAt: 'desc' },
        omit: { password: true },
        skip,
        take: limit,
      }),
      this.prisma.user.count({
        where: Object.keys(where).length ? where : undefined,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // FIND_ONE (par id)
  async findOneById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { password: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return user;
  }

  // UPDATE (par id - Admin)
  async updateById(id: string, updateUserDto: UpdateUserDto) {
    const exist = await this.prisma.user.findUnique({ where: { id } });
    if (!exist) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      omit: { password: true },
    });
  }

  // LOCK / UNLOCK (par id - Admin)
  async setLockState(id: string, locked: boolean) {
    const exist = await this.prisma.user.findUnique({ where: { id } });
    if (!exist) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return await this.prisma.user.update({
      where: { id },
      data: { deletedAt: locked ? new Date() : null },
      omit: { password: true },
    });
  }

  // DELETE (par id - Admin)
  async removeById(id: string) {
    const exist = await this.prisma.user.findUnique({ where: { id } });
    if (!exist) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.prisma.user.delete({ where: { id } });

    return {
      success: true,
      message: 'Utilisateur supprimé avec succès',
    };
  }

  // DETAIL
  async detail(req: Request) {
    const user = req.user as User;
    const profile = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    if (!profile) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    const { password, ...rest } = profile;

    return rest;
  }

  // UPDATE
  async update(req: Request, updateUserDto: UpdateUserDto) {
    const user = req.user as User;

    const newUser = await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: updateUserDto,
    });

    const { password, ...rest } = newUser;

    return rest;
  }

  // UPDATE PASSWORD
  async updatePassword(
    req: Request,
    updateUserPasswordDto: UpdateUserPasswordDto,
  ) {
    const user = req.user as User;

    const { password: pass, confirmPassword } = updateUserPasswordDto;

    if (pass !== confirmPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(pass, salt);

    const newUser = await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hash,
      },
    });

    const { password, ...rest } = newUser;

    return rest;
  }

  async resetPassword(
    req: Request,
    user_id: string,
  ): Promise<ResetUserPasswordResponseDto> {
    // Générer le salt et le hash
    const pass = this.generateDataService.generateSecurePassword();
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(pass, salt);

    const user = await this.prisma.user.update({
      where: {
        id: user_id,
      },
      data: {
        password: hash,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return {
      email: user.email,
      password: pass,
    };
  }

  // PARTIAL DELETE
  async partialRemove(req: Request) {
    const user = req.user as User;

    return await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  // RESTAURATION
  async restore(req: Request, id: string) {
    return await this.prisma.user.update({
      where: {
        id: id,
      },
      data: {
        deletedAt: null,
      },
    });
  }

  // DELETE
  async remove(req: Request, id: string) {
    const deletedUser = await this.prisma.user.delete({
      where: {
        id: id,
      },
    });

    const { password, ...rest } = deletedUser;
    return rest;
  }
}
