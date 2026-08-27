import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { extname } from 'path';

import { CreateUserDto } from '../dto/create-user.dto';
import { Prisma, StatutMembre } from '../../../generated/prisma/client';
import { AuthenticatedActor } from 'src/common/types/authenticated-actor';
import { SearchUserDto } from '../dto/search-user.dto';
import { PrismaService } from 'src/database/services/prisma.service';
import { HashService } from 'src/common/services/hash.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateUserPasswordDto } from '../dto/update-user-password.dto';
import { UpdateMemberStatutDto } from '../dto/update-member-statut.dto';
import { GenerateDataService } from 'src/common/services/generate-data.service';
import { GenerateConfigService } from 'src/common/services/generate-config.service';
import { R2StorageService } from 'src/common/services/r2-storage.service';
import { ResetUserPasswordResponseDto } from '../dto/reset-user-password.dto';
import { UploadAvatarResponseDto } from '../dto/upload-avatar.dto';

/** Durée de validité des URL présignées d'upload d'avatar, en secondes. */
const AVATAR_UPLOAD_EXPIRES_IN = 300;

/**
 * Champs exposables d'un membre.
 *
 * Selection EXPLICITE, et non `omit: { password: true }` : l'ancienne version
 * laissait sortir `otpSecret` — le secret TOTP servant a verifier l'email et a
 * reinitialiser le mot de passe — sur `GET /users`, `GET /users/:id/profile` et
 * `GET /users/detail`. Deux methodes retournaient meme l'objet Prisma brut,
 * hash de mot de passe inclus.
 */
const MEMBER_PUBLIC_SELECT = {
  id: true,
  fullname: true,
  email: true,
  phone: true,
  avatar: true,
  emailVerified: true,
  statut: true,
  suspendedAt: true,
  suspensionRaison: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly generateDataService: GenerateDataService,
    private readonly hashService: HashService,
    private readonly r2Service: R2StorageService,
  ) {}

  /**
   * Refuse une `avatarKey` qui ne pointe pas vers le dossier des avatars.
   *
   * Sans ce garde-fou, un client pourrait fournir la clé générée pour un
   * autre module (actualités, librairie…), ou une valeur arbitraire
   * n'importe où dans le bucket.
   */
  private assertAvatarKey(avatarKey?: string) {
    if (avatarKey === undefined) return;
    if (!avatarKey.startsWith('users-avatar/')) {
      throw new BadRequestException(
        "avatarKey doit être une clé générée par POST /users/avatar/upload-url",
      );
    }
  }

  /**
   * Extrait la clé objet R2 depuis la valeur stockée en base, si elle en a
   * la forme.
   *
   * Les comptes créés avant cette migration portent encore un chemin
   * `/uploads/users-avatar/...` ; certains peuvent même porter une valeur
   * antérieure non reconnaissable. Dans les deux cas, on ignore la
   * suppression plutôt que d'échouer : un avatar déjà remplacé en base ne
   * doit jamais faire échouer la requête à cause d'un objet R2 orphelin ou
   * inexistant.
   */
  private extractAvatarKey(avatar: string): string | null {
    const key = avatar.replace(/^\/?uploads\//, '');
    return key.startsWith('users-avatar/') ? key : null;
  }

  /** Suppression best-effort : l'échec ne doit pas faire échouer la requête. */
  private async deleteOldAvatar(avatar: string) {
    const key = this.extractAvatarKey(avatar);
    if (!key) return;

    try {
      await this.r2Service.delete(key);
    } catch (error) {
      this.logger.warn(
        `Impossible de supprimer l'avatar R2 ${key}: ${(error as Error).message}`,
      );
    }
  }

  /** Remplace la clé R2 stockée par son URL publique dans une réponse. */
  private mapMember<T extends { avatar?: string | null }>(member: T): T {
    if (!member.avatar) return member;
    return { ...member, avatar: this.r2Service.getPublicUrl(member.avatar) };
  }

  /** Génère une URL présignée pour l'avatar d'un membre. */
  async buildAvatarUploadUrl(
    filename: string,
    contentType: string,
  ): Promise<UploadAvatarResponseDto> {
    if (!filename.match(GenerateConfigService.ALLOWED_IMAGE_EXT)) {
      throw new BadRequestException(
        'Seuls les fichiers image sont acceptés (jpg, jpeg, png, gif, webp, heic, heif)',
      );
    }

    const ext = extname(filename);
    const name = await GenerateDataService.generateSecureImageName(filename);
    const key = `users-avatar/${name}${ext}`;
    const uploadUrl = await this.r2Service.getUploadUrl(
      key,
      contentType,
      AVATAR_UPLOAD_EXPIRES_IN,
    );

    return { key, uploadUrl, expiresIn: AVATAR_UPLOAD_EXPIRES_IN };
  }

  /**
   * Cree un compte membre depuis le back-office.
   *
   * Le mot de passe est genere par le serveur et retourne UNE SEULE FOIS a
   * l'administrateur qui cree le compte, a charge pour lui de le transmettre.
   */
  async createMember(createUserDto: CreateUserDto) {
    this.assertAvatarKey(createUserDto.avatarKey);

    const exists = await this.prisma.member.findUnique({
      where: { email: createUserDto.email },
      select: { id: true },
    });
    if (exists) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    const plainPassword = this.generateDataService.generateSecurePassword();
    const { avatarKey, ...userData } = createUserDto;

    const member = await this.prisma.member.create({
      data: {
        ...userData,
        password: await this.hashService.hash(plainPassword),
        avatar: avatarKey,
        // Cree par un administrateur : l'adresse est reputee verifiee.
        emailVerified: true,
      },
      select: MEMBER_PUBLIC_SELECT,
    });

    return { ...this.mapMember(member), password: plainPassword };
  }

  // FIND_ALL (pagine + filtres)
  async findAll(query: SearchUserDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.MemberWhereInput = {};

    if (query.search) {
      where.OR = [
        { fullname: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.statut) {
      where.statut = query.statut;
    }

    if (query.status === 'ACTIVE') {
      where.deletedAt = null;
    } else if (query.status === 'INACTIVE') {
      where.deletedAt = { not: null };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.member.findMany({
        where: Object.keys(where).length ? where : undefined,
        orderBy: { updatedAt: 'desc' },
        select: MEMBER_PUBLIC_SELECT,
        skip,
        take: limit,
      }),
      this.prisma.member.count({
        where: Object.keys(where).length ? where : undefined,
      }),
    ]);

    return {
      data: data.map((member) => this.mapMember(member)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findOneById(id: string) {
    const user = await this.prisma.member.findUnique({
      where: { id },
      select: MEMBER_PUBLIC_SELECT,
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return this.mapMember(user);
  }

  async updateById(id: string, updateUserDto: UpdateUserDto) {
    this.assertAvatarKey(updateUserDto.avatarKey);
    const existing = await this.assertExists(id);

    const { avatarKey, ...userData } = updateUserDto;
    const updated = await this.prisma.member.update({
      where: { id },
      data: { ...userData, ...(avatarKey ? { avatar: avatarKey } : {}) },
      select: MEMBER_PUBLIC_SELECT,
    });

    // L'ancien objet R2 n'etait jamais supprime : chaque remplacement d'avatar
    // laissait un orphelin definitif dans le bucket.
    if (avatarKey !== undefined && existing.avatar) {
      await this.deleteOldAvatar(existing.avatar);
    }

    return this.mapMember(updated);
  }

  /**
   * Suspend, bannit ou reactive un compte membre.
   *
   * Ecrit dans `statut` et non dans `deletedAt` : la suspension est une
   * decision de moderation, la suppression est un cycle de vie de compte.
   * Le controle de statut vit dans la strategie JWT, donc une suspension
   * coupe immediatement les tokens deja emis.
   */
  async setStatut(
    id: string,
    dto: UpdateMemberStatutDto,
    moderator: AuthenticatedActor,
  ) {
    await this.assertExists(id);

    const suspendu = dto.statut !== StatutMembre.ACTIF;

    const updated = await this.prisma.member.update({
      where: { id },
      data: {
        statut: dto.statut,
        suspendedAt: suspendu ? new Date() : null,
        suspensionRaison: suspendu ? (dto.raison ?? null) : null,
        suspendedById: suspendu ? moderator.id : null,
      },
      select: MEMBER_PUBLIC_SELECT,
    });

    return this.mapMember(updated);
  }

  /** Suppression logique : le compte disparait des surfaces publiques. */
  async softDeleteById(id: string) {
    await this.assertExists(id);

    const updated = await this.prisma.member.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: MEMBER_PUBLIC_SELECT,
    });

    return this.mapMember(updated);
  }

  async restore(id: string) {
    await this.assertExists(id);

    const updated = await this.prisma.member.update({
      where: { id },
      data: { deletedAt: null },
      select: MEMBER_PUBLIC_SELECT,
    });

    return this.mapMember(updated);
  }

  /**
   * Suppression definitive.
   *
   * Trois relations sont en `ON DELETE RESTRICT` (quiz passes, notifications) :
   * sans purge prealable, Prisma remonte une erreur de contrainte opaque. On
   * supprime donc explicitement les dependances dans une transaction.
   */
  async removeById(id: string) {
    await this.assertExists(id);

    await this.prisma.$transaction(async (tx) => {
      const userQuizzes = await tx.userQuiz.findMany({
        where: { userId: id },
        select: { id: true },
      });
      const userQuizIds = userQuizzes.map((uq) => uq.id);

      if (userQuizIds.length) {
        await tx.userAnswer.deleteMany({
          where: { userQuizId: { in: userQuizIds } },
        });
        await tx.userQuiz.deleteMany({ where: { userId: id } });
      }

      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.member.delete({ where: { id } });
    });

    return { success: true, message: 'Utilisateur supprimé définitivement' };
  }

  /** Profil du membre connecte. */
  async detail(actor: AuthenticatedActor) {
    return this.findOneById(actor.id);
  }

  async update(actor: AuthenticatedActor, updateUserDto: UpdateUserDto) {
    this.assertAvatarKey(updateUserDto.avatarKey);
    const existing = await this.assertExists(actor.id);

    const { avatarKey, ...userData } = updateUserDto;
    const updated = await this.prisma.member.update({
      where: { id: actor.id },
      data: { ...userData, ...(avatarKey ? { avatar: avatarKey } : {}) },
      select: MEMBER_PUBLIC_SELECT,
    });

    if (avatarKey !== undefined && existing.avatar) {
      await this.deleteOldAvatar(existing.avatar);
    }

    return this.mapMember(updated);
  }

  async updatePassword(
    actor: AuthenticatedActor,
    dto: UpdateUserPasswordDto,
  ) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    const current = await this.prisma.member.findUnique({
      where: { id: actor.id },
      select: { password: true },
    });

    if (!current) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const valid = await this.hashService.compare(
      dto.oldPassword,
      current.password,
    );
    if (!valid) {
      throw new BadRequestException('Le mot de passe actuel est incorrect');
    }

    const updated = await this.prisma.member.update({
      where: { id: actor.id },
      data: { password: await this.hashService.hash(dto.password) },
      select: MEMBER_PUBLIC_SELECT,
    });

    return this.mapMember(updated);
  }

  /** Genere un mot de passe temporaire, retourne une seule fois a l'admin. */
  async resetPassword(userId: string): Promise<ResetUserPasswordResponseDto> {
    await this.assertExists(userId);

    const plainPassword = this.generateDataService.generateSecurePassword();

    const user = await this.prisma.member.update({
      where: { id: userId },
      data: {
        password: await this.hashService.hash(plainPassword),
        otpSecret: null,
        otpPurpose: null,
        otpExpiresAt: null,
      },
      select: { email: true },
    });

    return { email: user.email, password: plainPassword };
  }

  /** Suppression de son propre compte par le membre. */
  async partialRemove(actor: AuthenticatedActor) {
    const updated = await this.prisma.member.update({
      where: { id: actor.id },
      data: { deletedAt: new Date() },
      select: MEMBER_PUBLIC_SELECT,
    });

    return this.mapMember(updated);
  }

  private async assertExists(id: string) {
    const exists = await this.prisma.member.findUnique({
      where: { id },
      select: { id: true, avatar: true },
    });
    if (!exists) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return exists;
  }
}
