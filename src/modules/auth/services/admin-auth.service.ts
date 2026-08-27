import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/services/prisma.service';
import { OtpPurpose } from '../../../generated/prisma/client';
import { HashService } from 'src/common/services/hash.service';
import { AuthenticatedActor } from 'src/common/types/authenticated-actor';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { AuthResponse, AuthService, OTP_TTL_MS } from './auth.service';
import { EmailService } from './email.service';

const INVALID_CREDENTIALS = 'Identifiants invalides';

/**
 * Flux d'authentification du back-office, distinct de celui des membres.
 *
 * Il n'y a volontairement pas d'inscription : les comptes admin sont crees
 * par le seed ou par `POST /admins` (reserve a l'administrateur national).
 */
@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
    private readonly emailService: EmailService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Connexion back-office.
   *
   * Ne controle pas `emailVerified` : ce champ n'existe pas sur `Admin`, les
   * comptes etant crees par un administrateur ou par le seed. Les controles
   * sont `deletedAt` et `isActive`.
   */
  async login(dto: AdminLoginDto): Promise<AuthResponse & { mustChangePassword: boolean }> {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (!admin || admin.deletedAt) {
      await this.hashService.compareWithDummy(dto.password);
      this.logger.warn({ action: 'ADMIN_LOGIN_FAILED', email: dto.email });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const valid = await this.hashService.compare(dto.password, admin.password);
    if (!valid) {
      this.logger.warn({ action: 'ADMIN_LOGIN_FAILED', adminId: admin.id });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Compte administrateur désactivé');
    }

    const tokens = await this.authService.generateTokens(
      admin.id,
      'admin',
      admin.role,
    );

    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log({
      action: 'ADMIN_LOGIN_SUCCESS',
      adminId: admin.id,
      role: admin.role,
    });

    return {
      ...this.authService.buildAuthResponse(admin, 'admin', admin.role, tokens),
      mustChangePassword: admin.mustChangePassword,
    };
  }

  /**
   * Changement de mot de passe par l'admin lui-meme.
   * Leve `mustChangePassword`, pose par le seed sur les comptes initiaux.
   */
  async changePassword(
    actor: AuthenticatedActor,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const admin = await this.prisma.admin.findUnique({
      where: { id: actor.id },
      select: { id: true, password: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Compte administrateur introuvable');
    }

    const valid = await this.hashService.compare(dto.oldPassword, admin.password);
    if (!valid) {
      throw new BadRequestException('Mot de passe actuel invalide');
    }

    if (await this.hashService.compare(dto.password, admin.password)) {
      throw new BadRequestException(
        'Le nouveau mot de passe doit être différent de l’actuel',
      );
    }

    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        password: await this.hashService.hash(dto.password),
        mustChangePassword: false,
        otpSecret: null,
        otpPurpose: null,
        otpExpiresAt: null,
      },
    });

    this.logger.log({ action: 'ADMIN_PASSWORD_CHANGED', adminId: admin.id });

    return { message: 'Mot de passe modifié avec succès.' };
  }

  /** Reponse toujours generique : ne revele pas l'existence d'un compte admin. */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const generic = {
      message:
        'Si un compte back-office est associé à cette adresse, un code de réinitialisation vient d’être envoyé.',
    };

    try {
      const admin = await this.prisma.admin.findUnique({
        where: { email: dto.email },
      });

      if (!admin || admin.deletedAt || !admin.isActive) {
        return generic;
      }

      const { secret, otp } = this.authService.generateOtp();

      await this.prisma.admin.update({
        where: { id: admin.id },
        data: {
          otpSecret: secret,
          otpPurpose: OtpPurpose.PASSWORD_RESET,
          otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
        },
      });

      await this.emailService.sendPasswordResetOtp(
        admin.email,
        admin.fullname,
        otp,
      );

      this.logger.log({
        action: 'ADMIN_PASSWORD_RESET_REQUESTED',
        adminId: admin.id,
      });

      return generic;
    } catch (error) {
      this.logger.error('Erreur lors de la demande de réinitialisation', error);
      return generic;
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const invalid = new BadRequestException(
      'Code de réinitialisation invalide ou expiré',
    );

    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (!admin || admin.deletedAt || !admin.otpSecret) {
      throw invalid;
    }
    if (admin.otpPurpose !== OtpPurpose.PASSWORD_RESET) {
      throw invalid;
    }
    if (admin.otpExpiresAt && admin.otpExpiresAt.getTime() < Date.now()) {
      throw invalid;
    }
    if (!this.authService.checkOtp(admin.otpSecret, dto.otp)) {
      throw invalid;
    }

    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        password: await this.hashService.hash(dto.password),
        mustChangePassword: false,
        otpSecret: null,
        otpPurpose: null,
        otpExpiresAt: null,
      },
    });

    this.logger.log({
      action: 'ADMIN_PASSWORD_RESET_SUCCESS',
      adminId: admin.id,
    });

    return { message: 'Votre mot de passe a été réinitialisé avec succès.' };
  }
}
