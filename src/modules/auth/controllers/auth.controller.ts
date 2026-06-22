import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { LoginUserDto } from 'src/modules/auth/dto/login-user.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtRefreshAuthGuard } from '../guards/jwt-refresh-auth.guard';
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
  @ApiOperation({
    summary: 'Connexion utilisateur',
    description:
      'Authentifie un utilisateur et retourne un JWT et un refresh token. Requiert que l\'email soit vérifié.',
  })
  @ApiBody({ type: LoginUserDto })
  @ApiOkResponse({ description: 'Connexion réussie — retourne user, token et refreshToken' })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Mot de passe incorrect ou email non vérifié' })
  async login(@Body() data: LoginUserDto) {
    return this.authService.login(data);
  }

  @Get('refresh-token')
  @UseGuards(JwtRefreshAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Rafraîchissement du token',
    description:
      'Génère un nouveau JWT à partir du refresh token fourni dans le header Authorization.',
  })
  @ApiOkResponse({ description: 'Nouveau JWT retourné' })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalide ou expiré' })
  async refreshToken(@Req() req: Request) {
    return this.authService.refreshToken(req);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Création de compte',
    description:
      'Crée un compte utilisateur non vérifié et envoie un code OTP à l\'adresse email fournie.',
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiCreatedResponse({
    description: 'Compte créé — un code OTP a été envoyé à l\'email',
    schema: {
      properties: {
        message: { type: 'string' },
        email: { type: 'string' },
      },
    },
  })
  @ApiConflictResponse({ description: 'Un compte avec cet email existe déjà' })
  async register(@Body() data: RegisterUserDto) {
    return this.authService.register(data);
  }

  @Post('verify-email')
  @ApiOperation({
    summary: 'Vérification email par OTP',
    description:
      'Vérifie le code OTP reçu par email. En cas de succès, retourne les tokens d\'authentification.',
  })
  @ApiBody({ type: VerifyEmailOtpDto })
  @ApiOkResponse({ description: 'Email vérifié — retourne user, token et refreshToken' })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  async verifyEmail(@Body() data: VerifyEmailOtpDto) {
    return this.authService.verifyEmail(data);
  }

  @Post('resend-email-otp')
  @ApiOperation({
    summary: 'Renvoi du code OTP',
    description: 'Génère un nouveau code OTP et le renvoie à l\'adresse email indiquée.',
  })
  @ApiBody({ type: ResendEmailOtpDto })
  @ApiOkResponse({
    description: 'Nouveau code envoyé',
    schema: { properties: { message: { type: 'string' } } },
  })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  async resendEmailOtp(@Body() data: ResendEmailOtpDto) {
    return this.authService.resendEmailOtp(data);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Mot de passe oublié',
    description:
      'Envoie un code de réinitialisation à l\'adresse email fournie. Retourne toujours un message générique pour ne pas révéler l\'existence du compte.',
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
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  async resetPassword(@Body() data: ResetPasswordDto) {
    return this.authService.resetPassword(data);
  }
}
