import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { LoginUserDto } from 'src/modules/auth/dto/login-user.dto';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtRefreshAuthGuard } from '../guards/jwt-refresh-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthenticatedActor } from 'src/common/types/authenticated-actor';
import { RegisterUserDto } from '../dto/register-user.dto';
import { VerifyEmailOtpDto } from '../dto/verify-email-otp.dto';
import { ResendEmailOtpDto } from '../dto/resend-email-otp.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Connexion membre',
    description:
      "Authentifie un membre et retourne un JWT et un refresh token. Requiert que l'email soit vérifié.",
  })
  @ApiBody({ type: LoginUserDto })
  @ApiOkResponse({
    description: 'Connexion réussie — retourne le profil, les capacités et les tokens',
  })
  @ApiUnauthorizedResponse({
    description: 'Identifiants invalides, email non vérifié, ou compte suspendu',
  })
  @ApiTooManyRequestsResponse({ description: 'Trop de tentatives de connexion' })
  async login(@Body() data: LoginUserDto) {
    return this.authService.login(data);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Profil de l’acteur connecté',
    description: 'Fonctionne pour un membre comme pour un administrateur.',
  })
  @ApiOkResponse({ description: 'Profil courant' })
  me(@CurrentUser() actor: AuthenticatedActor) {
    return actor;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Déconnexion',
    description:
      "Journalise la déconnexion. L'authentification étant sans état, le client doit supprimer ses tokens ; la révocation côté serveur nécessiterait une table de sessions.",
  })
  @ApiNoContentResponse({ description: 'Déconnexion enregistrée' })
  logout() {
    return;
  }

  @Get('refresh-token')
  @UseGuards(JwtRefreshAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Rafraîchissement du token',
    description:
      'Génère une nouvelle paire de tokens à partir du refresh token fourni dans le header Authorization.',
  })
  @ApiOkResponse({ description: 'Nouvelle paire de tokens' })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalide ou expiré' })
  async refreshToken(@Req() req: Request) {
    return this.authService.refreshToken(req);
  }

  @Post('refresh-token')
  @UseGuards(JwtRefreshAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Rafraîchissement du token' })
  @ApiOkResponse({ description: 'Nouvelle paire de tokens' })
  async refreshTokenPost(@Req() req: Request) {
    return this.authService.refreshToken(req);
  }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @ApiOperation({
    summary: 'Création de compte membre',
    description:
      "Crée un compte non vérifié et envoie un code OTP à l'adresse email fournie.",
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiCreatedResponse({
    description: "Compte créé — un code OTP a été envoyé à l'email",
    schema: {
      properties: { message: { type: 'string' }, email: { type: 'string' } },
    },
  })
  @ApiBadRequestResponse({ description: 'Email déjà utilisé ou données invalides' })
  @ApiTooManyRequestsResponse({ description: 'Trop de créations de compte' })
  async register(@Body() data: RegisterUserDto) {
    return this.authService.register(data);
  }

  @Post('verify-email')
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @ApiOperation({
    summary: 'Vérification email par OTP',
    description:
      "Vérifie le code OTP reçu par email. En cas de succès, retourne les tokens d'authentification.",
  })
  @ApiBody({ type: VerifyEmailOtpDto })
  @ApiOkResponse({ description: 'Email vérifié — retourne le profil et les tokens' })
  @ApiBadRequestResponse({ description: 'Code OTP invalide ou expiré' })
  async verifyEmail(@Body() data: VerifyEmailOtpDto) {
    return this.authService.verifyEmail(data);
  }

  @Post('resend-email-otp')
  @Throttle({ default: { limit: 3, ttl: 900_000 } })
  @ApiOperation({
    summary: 'Renvoi du code OTP',
    description:
      "Génère un nouveau code OTP. Réponse générique : ne révèle pas l'existence du compte.",
  })
  @ApiBody({ type: ResendEmailOtpDto })
  @ApiOkResponse({
    description: 'Demande prise en compte',
    schema: { properties: { message: { type: 'string' } } },
  })
  @ApiTooManyRequestsResponse({ description: "Trop d'envois de code" })
  async resendEmailOtp(@Body() data: ResendEmailOtpDto) {
    return this.authService.resendEmailOtp(data);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 900_000 } })
  @ApiOperation({
    summary: 'Mot de passe oublié',
    description:
      "Envoie un code de réinitialisation. Retourne toujours un message générique pour ne pas révéler l'existence du compte.",
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    description: 'Demande prise en compte',
    schema: { properties: { message: { type: 'string' } } },
  })
  async forgotPassword(@Body() data: ForgotPasswordDto) {
    return this.authService.forgotPassword(data);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @ApiOperation({
    summary: 'Réinitialisation du mot de passe',
    description:
      'Définit un nouveau mot de passe à partir du code de réinitialisation reçu par email.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({
    description: 'Mot de passe réinitialisé',
    schema: { properties: { message: { type: 'string' } } },
  })
  @ApiBadRequestResponse({ description: 'Code de réinitialisation invalide ou expiré' })
  async resetPassword(@Body() data: ResetPasswordDto) {
    return this.authService.resetPassword(data);
  }
}
