import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/services/prisma.service';
import { Request } from 'express';
import { OtpPurpose } from '../../../generated/prisma/client';
import { LoginUserDto } from 'src/modules/auth/dto/login-user.dto';
import { JsonWebTokenService } from 'src/json-web-token/json-web-token.service';
import {
  Capability,
  capabilitiesFor,
  LEGACY_PERMISSIONS,
} from 'src/common/constantes/capabilities-by-role';
import {
  ActorRole,
  AuthenticatedActor,
  ActorType,
  MEMBER_ROLE,
} from 'src/common/types/authenticated-actor';
import { HashService } from 'src/common/services/hash.service';
import { RegisterUserDto } from '../dto/register-user.dto';
import { VerifyEmailOtpDto } from '../dto/verify-email-otp.dto';
import { ResendEmailOtpDto } from '../dto/resend-email-otp.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { EmailService } from './email.service';
import { totp, authenticator } from 'otplib';

// Duree de validite de l'OTP email : 10 minutes.
export const OTP_STEP_SECONDS = 600;
// `window: 1` accepte aussi le pas precedent, d'ou une validite effective
// d'environ 20 minutes. `otpExpiresAt` borne cela de facon explicite.
export const OTP_TTL_MS = OTP_STEP_SECONDS * 1000;

export interface TokenResponse {
  token: string;
  refreshToken: string;
}

export interface AuthResponse extends TokenResponse {
  id: string;
  email: string;
  fullname: string;
  phone?: string | null;
  avatar?: string | null;
  type: ActorType;
  role: ActorRole;
  capabilities: Capability[];
  /** @deprecated conserve pour compatibilite du front deja livre. */
  permissions: typeof LEGACY_PERMISSIONS;
}

export interface OtpSentResponse {
  message: string;
  email: string;
}

/** Message unique pour toute erreur d'identifiants (anti-enumeration). */
const INVALID_CREDENTIALS = 'Identifiants invalides';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jsonWebTokenService: JsonWebTokenService,
    private readonly emailService: EmailService,
    private readonly hashService: HashService,
  ) {}

  async generateTokens(
    id: string,
    type: ActorType,
    role: ActorRole,
  ): Promise<TokenResponse> {
    const payload = { sub: id, type, role };
    const [token, refreshToken] = await Promise.all([
      this.jsonWebTokenService.generateToken(payload),
      this.jsonWebTokenService.generateRefreshToken(payload),
    ]);
    return { token, refreshToken };
  }

  buildAuthResponse(
    actor: {
      id: string;
      email: string;
      fullname: string;
      phone?: string | null;
      avatar?: string | null;
    },
    type: ActorType,
    role: ActorRole,
    tokens: TokenResponse,
  ): AuthResponse {
    return {
      id: actor.id,
      email: actor.email,
      fullname: actor.fullname,
      phone: actor.phone ?? null,
      avatar: actor.avatar ?? null,
      type,
      role,
      capabilities: capabilitiesFor(role),
      permissions: LEGACY_PERMISSIONS,
      token: tokens.token,
      refreshToken: tokens.refreshToken,
    };
  }

  private generateOtp(): { secret: string; otp: string } {
    const secret = authenticator.generateSecret(20);
    totp.options = { step: OTP_STEP_SECONDS, digits: 6, window: 1 };
    const otp = totp.generate(secret);
    return { secret, otp };
  }

  private checkOtp(secret: string, otp: string): boolean {
    totp.options = { step: OTP_STEP_SECONDS, digits: 6, window: 1 };
    return totp.verify({ token: otp, secret });
  }

  /**
   * Valide un OTP en verifiant aussi son USAGE et son echeance.
   *
   * Sans le controle de `purpose`, un code obtenu via /auth/resend-email-otp
   * fonctionnait sur /auth/reset-password : les deux flux partageaient le meme
   * champ `otpSecret`, ce qui permettait de reinitialiser le mot de passe de
   * n'importe quel compte dont on pouvait declencher une verification d'email.
   */
  private isOtpValid(
    record: {
      otpSecret: string | null;
      otpPurpose: OtpPurpose | null;
      otpExpiresAt: Date | null;
    },
    otp: string,
    expected: OtpPurpose,
  ): boolean {
    if (!record.otpSecret) return false;
    if (record.otpPurpose !== expected) return false;
    if (record.otpExpiresAt && record.otpExpiresAt.getTime() < Date.now()) {
      return false;
    }
    return this.checkOtp(record.otpSecret, otp);
  }

  private otpData(purpose: OtpPurpose) {
    const { secret, otp } = this.generateOtp();
    return {
      otp,
      data: {
        otpSecret: secret,
        otpPurpose: purpose,
        otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    };
  }

  /**
   * Connexion membre.
   *
   * Toutes les causes d'echec renvoient le meme 401 : email inconnu, mot de
   * passe faux, compte supprime. L'ancienne version repondait 404 sur email
   * inconnu et 400 sur mot de passe faux, ce qui permettait d'enumerer les
   * comptes. Le hash factice egalise aussi le temps de reponse.
   */
  async login(loginUserDto: LoginUserDto): Promise<AuthResponse> {
    const user = await this.prisma.member.findUnique({
      where: { email: loginUserDto.email },
    });

    if (!user || user.deletedAt) {
      await this.hashService.compareWithDummy(loginUserDto.password);
      this.logger.warn({ action: 'LOGIN_FAILED', email: loginUserDto.email });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const isPasswordValid = await this.hashService.compare(
      loginUserDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      this.logger.warn({ action: 'LOGIN_FAILED', userId: user.id });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Distinct des identifiants invalides : l'utilisateur a besoin de savoir
    // qu'il doit verifier son email, et il vient de prouver qu'il detient le
    // compte.
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Veuillez vérifier votre adresse email avant de vous connecter',
      );
    }

    if (user.statut !== 'ACTIF') {
      throw new UnauthorizedException(
        user.statut === 'BANNI' ? 'Compte banni' : 'Compte suspendu',
      );
    }

    const tokens = await this.generateTokens(user.id, 'member', MEMBER_ROLE);
    this.logger.log({ action: 'LOGIN_SUCCESS', userId: user.id });

    return this.buildAuthResponse(user, 'member', MEMBER_ROLE, tokens);
  }

  /**
   * Inscription — cree un compte non verifie et envoie un OTP par email.
   */
  async register(registerUserDto: RegisterUserDto): Promise<OtpSentResponse> {
    const existingUser = await this.prisma.member.findUnique({
      where: { email: registerUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Cet email est déjà utilisé');
    }

    const hashedPassword = await this.hashService.hash(registerUserDto.password);
    const { otp, data } = this.otpData(OtpPurpose.EMAIL_VERIFICATION);

    const newUser = await this.prisma.member.create({
      data: {
        email: registerUserDto.email,
        password: hashedPassword,
        fullname: registerUserDto.fullname,
        phone: registerUserDto.phone,
        emailVerified: false,
        ...data,
      },
    });

    await this.emailService.sendEmailVerificationOtp(
      newUser.email,
      newUser.fullname,
      otp,
    );

    this.logger.log({ action: 'REGISTER_SUCCESS', userId: newUser.id });

    return {
      message: 'Un code de vérification a été envoyé à votre adresse email',
      email: newUser.email,
    };
  }

  /**
   * Verifie le code OTP recu par email et retourne les tokens si valide.
   */
  async verifyEmail(dto: VerifyEmailOtpDto): Promise<AuthResponse> {
    const user = await this.prisma.member.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.deletedAt) {
      throw new BadRequestException('Code OTP invalide ou expiré');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Cet email est déjà vérifié');
    }

    if (!this.isOtpValid(user, dto.otp, OtpPurpose.EMAIL_VERIFICATION)) {
      throw new BadRequestException('Code OTP invalide ou expiré');
    }

    const verifiedUser = await this.prisma.member.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        otpSecret: null,
        otpPurpose: null,
        otpExpiresAt: null,
      },
    });

    const tokens = await this.generateTokens(
      verifiedUser.id,
      'member',
      MEMBER_ROLE,
    );

    this.logger.log({ action: 'EMAIL_VERIFIED', userId: user.id });

    return this.buildAuthResponse(verifiedUser, 'member', MEMBER_ROLE, tokens);
  }

  /**
   * Renvoie un nouveau code OTP de verification d'email.
   */
  async resendEmailOtp(dto: ResendEmailOtpDto): Promise<{ message: string }> {
    const generic = {
      message:
        'Si un compte non vérifié est associé à cette adresse, un nouveau code vient d’être envoyé.',
    };

    const user = await this.prisma.member.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.deletedAt || user.emailVerified) {
      return generic;
    }

    const { otp, data } = this.otpData(OtpPurpose.EMAIL_VERIFICATION);

    await this.prisma.member.update({ where: { id: user.id }, data });
    await this.emailService.sendEmailVerificationOtp(
      user.email,
      user.fullname,
      otp,
    );

    return generic;
  }

  /**
   * Rafraichit la paire de tokens a partir du refresh token.
   */
  async refreshToken(req: Request): Promise<TokenResponse> {
    const actor = req.user as AuthenticatedActor | undefined;

    if (!actor?.id) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    this.logger.log({ action: 'REFRESH_TOKEN', actorId: actor.id });

    return this.generateTokens(actor.id, actor.type, actor.role);
  }

  /**
   * Mot de passe oublie — envoie un code OTP de reinitialisation.
   * Reponse toujours generique : ne revele pas si l'email existe.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const generic = {
      message:
        'Si un compte est associé à cette adresse, un code de réinitialisation vient d’être envoyé.',
    };

    try {
      const user = await this.prisma.member.findUnique({
        where: { email: dto.email },
      });

      if (!user || user.deletedAt) {
        return generic;
      }

      const { otp, data } = this.otpData(OtpPurpose.PASSWORD_RESET);

      await this.prisma.member.update({ where: { id: user.id }, data });
      await this.emailService.sendPasswordResetOtp(
        user.email,
        user.fullname,
        otp,
      );

      this.logger.log({ action: 'PASSWORD_RESET_REQUESTED', userId: user.id });

      return generic;
    } catch (error) {
      this.logger.error('Erreur lors de la demande de réinitialisation', error);
      return generic;
    }
  }

  /**
   * Reinitialise le mot de passe a partir du code OTP.
   *
   * Message d'erreur uniforme : l'ancienne version repondait 404 sur email
   * inconnu, alors meme que /auth/forgot-password restait generique — la paire
   * permettait donc d'enumerer les comptes.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const invalid = new BadRequestException(
      'Code de réinitialisation invalide ou expiré',
    );

    const user = await this.prisma.member.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.deletedAt) {
      throw invalid;
    }

    if (!this.isOtpValid(user, dto.otp, OtpPurpose.PASSWORD_RESET)) {
      throw invalid;
    }

    const hashedPassword = await this.hashService.hash(dto.password);

    await this.prisma.member.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        otpSecret: null,
        otpPurpose: null,
        otpExpiresAt: null,
      },
    });

    this.logger.log({ action: 'PASSWORD_RESET_SUCCESS', userId: user.id });

    return { message: 'Votre mot de passe a été réinitialisé avec succès.' };
  }
}
