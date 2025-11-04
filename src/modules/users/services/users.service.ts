import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateUserDto } from '../dto/create-user.dto';
import { User, UserRole } from '@prisma/client';
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

  // FIND_ALL
  async findAll() {
    return await this.prisma.user.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      omit: {
        password: true,
      },
    });
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
