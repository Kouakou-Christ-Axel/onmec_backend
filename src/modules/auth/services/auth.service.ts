import { BadRequestException, Injectable, Logger, NotFoundException, } from '@nestjs/common';
import { PrismaService } from 'src/database/services/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Request } from 'express';
import { User, UserRole } from '@prisma/client';
import { LoginUserDto } from 'src/modules/auth/dto/login-user.dto';
import { JsonWebTokenService } from 'src/json-web-token/json-web-token.service';
import { permissionsByRole, RolePermissions, } from 'src/common/constantes/permissionsByRole';
import { RegisterUserDto } from '../dto/register-user.dto';

export interface TokenResponse {
  token: string;
  refreshToken: string;
}

export interface AuthResponse extends TokenResponse {
  id: string;
  email: string;
  fullname: string;
  phone?: string|null;
  role: UserRole;
  permissions: RolePermissions;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jsonWebTokenService: JsonWebTokenService,
  ) {}

  /**
   * Génère les tokens (JWT et Refresh) pour un utilisateur
   * @param userId - ID de l'utilisateur
   * @returns Promise contenant le token et le refreshToken
   */
  private async generateTokens(userId: string): Promise<TokenResponse> {
    try {
      const token = await this.jsonWebTokenService.generateToken(userId);
      const refreshToken =
        await this.jsonWebTokenService.generateRefreshToken(userId);

      return { token, refreshToken };
    } catch (error) {
      this.logger.error('Erreur lors de la génération des tokens', error);
      throw new BadRequestException(
        'Impossible de générer les tokens d\'authentification',
      );
    }
  }

  /**
   * Prépare la réponse d'authentification avec les informations de l'utilisateur
   * @param user - Utilisateur depuis la BD
   * @param tokens - Tokens générés
   * @returns Réponse d'authentification formatée
   */
  private buildAuthResponse(user: User, tokens: TokenResponse): AuthResponse {
    const rolePermissions = permissionsByRole[user.role as UserRole] || [];

    return {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      phone: user.phone,
      role: user.role,
      permissions: rolePermissions,
      token: tokens.token,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Connexion d'un utilisateur
   * @param loginUserDto - Email et mot de passe
   * @returns AuthResponse avec tokens et informations utilisateur
   */
  async login(loginUserDto: LoginUserDto): Promise<AuthResponse> {
    try {
      this.logger.log({
        action: 'LOGIN',
        message: `Tentative de connexion pour: ${loginUserDto.email}`,
      });

      // Récupérer l'utilisateur
      const user = await this.prisma.user.findUnique({
        where: { email: loginUserDto.email },
      });

      if (!user) {
        this.logger.warn({
          action: 'LOGIN_FAILED',
          reason: 'USER_NOT_FOUND',
          email: loginUserDto.email,
        });
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(
        loginUserDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        this.logger.warn({
          action: 'LOGIN_FAILED',
          reason: 'INVALID_PASSWORD',
          email: loginUserDto.email,
        });
        throw new BadRequestException('Mot de passe invalide');
      }

      // Générer les tokens
      const tokens = await this.generateTokens(user.id);

      // Construire et retourner la réponse
      const authResponse = this.buildAuthResponse(user, tokens);

      this.logger.log({
        action: 'LOGIN_SUCCESS',
        userId: user.id,
        email: user.email,
      });

      return authResponse;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error('Erreur lors de la connexion', error);
      throw new BadRequestException('Erreur lors de la connexion');
    }
  }

  /**
   * Enregistrement d'un nouvel utilisateur
   * @param registerUserDto - Email, mot de passe et informations
   * @returns AuthResponse avec tokens et informations utilisateur
   */
  async register(registerUserDto: RegisterUserDto): Promise<AuthResponse> {
    try {
      this.logger.log({
        action: 'REGISTER',
        message: `Tentative d'enregistrement pour: ${registerUserDto.email}`,
      });

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await this.prisma.user.findUnique({
        where: { email: registerUserDto.email },
      });

      if (existingUser) {
        this.logger.warn({
          action: 'REGISTER_FAILED',
          reason: 'USER_ALREADY_EXISTS',
          email: registerUserDto.email,
        });
        throw new BadRequestException('Cet email est déjà utilisé');
      }

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);

      // Créer le nouvel utilisateur
      const newUser = await this.prisma.user.create({
        data: {
          email: registerUserDto.email,
          password: hashedPassword,
          fullname: registerUserDto.fullname,
          phone: registerUserDto.phone,
          role: UserRole.MEMBER, // Rôle par défaut
        },
      });

      // Générer les tokens
      const tokens = await this.generateTokens(newUser.id);

      // Construire et retourner la réponse
      const authResponse = this.buildAuthResponse(newUser, tokens);

      this.logger.log({
        action: 'REGISTER_SUCCESS',
        userId: newUser.id,
        email: newUser.email,
      });

      return authResponse;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Erreur lors de l\'enregistrement', error);
      throw new BadRequestException('Erreur lors de l\'enregistrement');
    }
  }

  /**
   * Rafraîchit le token JWT
   * @param req - Requête contenant l'utilisateur authentifié
   * @returns Nouveaux tokens
   */
  async refreshToken(req: Request): Promise<TokenResponse> {
    try {
      const user = req.user as User;

      if (!user || !user.id) {
        throw new BadRequestException('Utilisateur non authentifié');
      }

      this.logger.log({
        action: 'REFRESH_TOKEN',
        userId: user.id,
      });

      return await this.generateTokens(user.id);

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Erreur lors du rafraîchissement du token', error);
      throw new BadRequestException(
        'Erreur lors du rafraîchissement du token',
      );
    }
  }
}
