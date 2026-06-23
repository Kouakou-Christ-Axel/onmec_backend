import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/services/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Request } from 'express';
import { User, UserRole } from '../../../generated/prisma/client';
import { LoginUserDto } from 'src/modules/auth/dto/login-user.dto';
import { JsonWebTokenService } from 'src/json-web-token/json-web-token.service';
import { permissionsByRole, RolePermissions } from 'src/common/constantes/permissionsByRole';
import { RegisterUserDto } from '../dto/register-user.dto';
import { VerifyEmailOtpDto } from '../dto/verify-email-otp.dto';
import { ResendEmailOtpDto } from '../dto/resend-email-otp.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { EmailService } from './email.service';
import { totp, authenticator } from 'otplib';

// Durée de validité de l'OTP email : 10 minutes
const OTP_STEP_SECONDS = 600;

export interface TokenResponse {
  token: string;
  refreshToken: string;
}

export interface AuthResponse extends TokenResponse {
  id: string;
  email: string;
  fullname: string;
  phone?: string | null;
  role: UserRole;
  permissions: RolePermissions;
}

export interface OtpSentResponse {
  message: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jsonWebTokenService: JsonWebTokenService,
    private readonly emailService: EmailService,
  ) {}

  private async generateTokens(userId: string): Promise<TokenResponse> {
    try {
      const token = await this.jsonWebTokenService.generateToken(userId);
      const refreshToken = await this.jsonWebTokenService.generateRefreshToken(userId);
      return { token, refreshToken };
    } catch (error) {
      this.logger.error('Erreur lors de la génération des tokens', error);
      throw new BadRequestException("Impossible de générer les tokens d'authentification");
    }
  }

  private buildAuthResponse(user: User, tokens: TokenResponse): AuthResponse {
    return {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      phone: user.phone,
      role: user.role,
      permissions: permissionsByRole[user.role as UserRole] || [],
      token: tokens.token,
      refreshToken: tokens.refreshToken,
    };
  }

  private generateEmailOtp(): { secret: string; otp: string } {
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
   * Connexion — bloque si l'email n'est pas encore vérifié
   */
  async login(loginUserDto: LoginUserDto): Promise<AuthResponse> {
    try {
      this.logger.log({
        action: 'LOGIN',
        message: `Tentative de connexion pour: ${loginUserDto.email}`,
      });

      const user = await this.prisma.user.findUnique({
        where: { email: loginUserDto.email },
      });

      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      const isPasswordValid = await bcrypt.compare(loginUserDto.password, user.password);
      if (!isPasswordValid) {
        throw new BadRequestException('Mot de passe invalide');
      }

      if (!user.emailVerified) {
        throw new UnauthorizedException(
          'Veuillez vérifier votre adresse email avant de vous connecter',
        );
      }

      const tokens = await this.generateTokens(user.id);

      this.logger.log({ action: 'LOGIN_SUCCESS', userId: user.id, email: user.email });

      return this.buildAuthResponse(user, tokens);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Erreur lors de la connexion', error);
      throw new BadRequestException('Erreur lors de la connexion');
    }
  }

  /**
   * Inscription — crée un compte non vérifié et envoie un OTP par email
   */
  async register(registerUserDto: RegisterUserDto): Promise<OtpSentResponse> {
    try {
      this.logger.log({
        action: 'REGISTER',
        message: `Tentative d'enregistrement pour: ${registerUserDto.email}`,
      });

      const existingUser = await this.prisma.user.findUnique({
        where: { email: registerUserDto.email },
      });

      if (existingUser) {
        throw new BadRequestException('Cet email est déjà utilisé');
      }

      const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);
      const { secret, otp } = this.generateEmailOtp();

      const newUser = await this.prisma.user.create({
        data: {
          email: registerUserDto.email,
          password: hashedPassword,
          fullname: registerUserDto.fullname,
          phone: registerUserDto.phone,
          role: UserRole.MEMBER,
          emailVerified: false,
          otpSecret: secret,
        },
      });

      await this.emailService.sendEmailVerificationOtp(newUser.email, newUser.fullname, otp);

      this.logger.log({ action: 'REGISTER_SUCCESS', userId: newUser.id, email: newUser.email });

      return {
        message: 'Un code de vérification a été envoyé à votre adresse email',
        email: newUser.email,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error("Erreur lors de l'enregistrement", error);
      throw new BadRequestException("Erreur lors de l'enregistrement");
    }
  }

  /**
   * Vérifie le code OTP reçu par email et retourne les tokens si valide
   */
  async verifyEmail(dto: VerifyEmailOtpDto): Promise<AuthResponse> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      if (user.emailVerified) {
        throw new BadRequestException('Cet email est déjà vérifié');
      }

      if (!user.otpSecret) {
        throw new BadRequestException(
          'Aucun code en attente — utilisez /auth/resend-email-otp pour en obtenir un nouveau',
        );
      }

      if (!this.checkOtp(user.otpSecret, dto.otp)) {
        throw new BadRequestException('Code OTP invalide ou expiré');
      }

      const verifiedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, otpSecret: null },
      });

      const tokens = await this.generateTokens(verifiedUser.id);

      this.logger.log({ action: 'EMAIL_VERIFIED', userId: user.id, email: user.email });

      return this.buildAuthResponse(verifiedUser, tokens);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Erreur lors de la vérification email', error);
      throw new BadRequestException('Erreur lors de la vérification');
    }
  }

  /**
   * Renvoie un nouveau code OTP à l'email donné
   */
  async resendEmailOtp(dto: ResendEmailOtpDto): Promise<{ message: string }> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      if (user.emailVerified) {
        throw new BadRequestException('Cet email est déjà vérifié');
      }

      const { secret, otp } = this.generateEmailOtp();

      await this.prisma.user.update({
        where: { id: user.id },
        data: { otpSecret: secret },
      });

      await this.emailService.sendEmailVerificationOtp(user.email, user.fullname, otp);

      return { message: 'Un nouveau code de vérification a été envoyé à votre adresse email' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error("Erreur lors du renvoi de l'OTP", error);
      throw new BadRequestException('Erreur lors du renvoi du code');
    }
  }

  /**
   * Rafraîchit le token JWT
   */
  async refreshToken(req: Request): Promise<TokenResponse> {
    try {
      const user = req.user as User;

      if (!user || !user.id) {
        throw new BadRequestException('Utilisateur non authentifié');
      }

      this.logger.log({ action: 'REFRESH_TOKEN', userId: user.id });

      return await this.generateTokens(user.id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Erreur lors du rafraîchissement du token', error);
      throw new BadRequestException('Erreur lors du rafraîchissement du token');
    }
  }

  /**
   * Mot de passe oublié — envoie un code OTP de réinitialisation par email.
   * Retourne toujours un message générique pour ne pas révéler si l'email existe.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const genericResponse = {
      message:
        'Si un compte est associé à cette adresse, un code de réinitialisation vient d\'être envoyé.',
    };

    try {
      const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

      // On ne révèle pas l'inexistence du compte.
      if (!user) {
        return genericResponse;
      }

      const { secret, otp } = this.generateEmailOtp();

      await this.prisma.user.update({
        where: { id: user.id },
        data: { otpSecret: secret },
      });

      await this.emailService.sendPasswordResetOtp(user.email, user.fullname, otp);

      this.logger.log({ action: 'PASSWORD_RESET_REQUESTED', userId: user.id, email: user.email });

      return genericResponse;
    } catch (error) {
      this.logger.error('Erreur lors de la demande de réinitialisation', error);
      // On reste générique même en cas d'erreur interne d'envoi.
      return genericResponse;
    }
  }

  /**
   * Réinitialise le mot de passe à partir du code OTP reçu par email.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      if (!user.otpSecret) {
        throw new BadRequestException(
          'Aucune demande de réinitialisation en attente — utilisez /auth/forgot-password',
        );
      }

      if (!this.checkOtp(user.otpSecret, dto.otp)) {
        throw new BadRequestException('Code de réinitialisation invalide ou expiré');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, otpSecret: null },
      });

      this.logger.log({ action: 'PASSWORD_RESET_SUCCESS', userId: user.id, email: user.email });

      return { message: 'Votre mot de passe a été réinitialisé avec succès.' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Erreur lors de la réinitialisation du mot de passe', error);
      throw new BadRequestException('Erreur lors de la réinitialisation du mot de passe');
    }
  }
}
