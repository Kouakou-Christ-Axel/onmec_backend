import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from '../guards/jwt-refresh-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthenticatedActor } from 'src/common/types/authenticated-actor';
import { AuthService } from '../services/auth.service';

/**
 * Authentification du back-office.
 *
 * Pas de route d'inscription : les comptes admin viennent du seed ou de
 * `POST /admins`, reserve a l'administrateur national.
 */
@ApiTags('Auth Admin')
@Controller('auth/admin')
export class AdminAuthController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Connexion back-office',
    description:
      'Authentifie un compte administrateur. La réponse porte `type: "admin"`, le rôle, les capacités et `mustChangePassword`.',
  })
  @ApiBody({ type: AdminLoginDto })
  @ApiOkResponse({ description: 'Connexion réussie' })
  @ApiUnauthorizedResponse({ description: 'Identifiants invalides ou compte désactivé' })
  @ApiTooManyRequestsResponse({ description: 'Trop de tentatives' })
  async login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto);
  }

  @Get('refresh-token')
  @UseGuards(JwtRefreshAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Rafraîchissement du token back-office' })
  @ApiOkResponse({ description: 'Nouvelle paire de tokens' })
  async refreshTokenGet(@CurrentUser() actor: AuthenticatedActor) {
    return this.authService.refreshToken(actor);
  }

  @Post('refresh-token')
  @UseGuards(JwtRefreshAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Rafraîchissement du token back-office' })
  @ApiOkResponse({ description: 'Nouvelle paire de tokens' })
  async refreshTokenPost(@CurrentUser() actor: AuthenticatedActor) {
    return this.authService.refreshToken(actor);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Profil de l’administrateur connecté' })
  @ApiOkResponse({ description: 'Profil et capacités' })
  @ApiForbiddenResponse({ description: 'Réservé aux comptes back-office' })
  me(@CurrentUser() actor: AuthenticatedActor) {
    return actor;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Changement de mot de passe',
    description: 'Lève `mustChangePassword`, posé par le seed sur les comptes initiaux.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ description: 'Mot de passe modifié' })
  async changePassword(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.adminAuthService.changePassword(actor, dto);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 900_000 } })
  @ApiOperation({
    summary: 'Mot de passe oublié (back-office)',
    description: 'Réponse toujours générique : ne révèle pas l’existence du compte.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ description: 'Demande prise en compte' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.adminAuthService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @ApiOperation({ summary: 'Réinitialisation du mot de passe (back-office)' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'Mot de passe réinitialisé' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.adminAuthService.resetPassword(dto);
  }
}
