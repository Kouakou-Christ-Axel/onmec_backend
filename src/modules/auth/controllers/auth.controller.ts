import { Body, Controller, Get, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { LoginUserDto } from 'src/modules/auth/dto/login-user.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtRefreshAuthGuard } from '../guards/jwt-refresh-auth.guard';
import { RegisterUserDto } from '../dto/register-user.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Connexion utilisateur', description: 'Authentifie un utilisateur et retourne un JWT et un refresh token.' })
  @ApiBody({ type: LoginUserDto })
  @ApiOkResponse({ description: 'Connexion réussie — retourne user, token et refreshToken' })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  @ApiUnauthorizedResponse({ description: 'Mot de passe incorrect' })
  async login(@Body() data: LoginUserDto) {
    return this.authService.login(data);
  }

  @Get('refresh-token')
  @UseGuards(JwtRefreshAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Rafraîchissement du token', description: 'Génère un nouveau JWT à partir du refresh token fourni dans le header Authorization.' })
  @ApiOkResponse({ description: 'Nouveau JWT retourné' })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalide ou expiré' })
  async refreshToken(@Req() req: Request) {
    return this.authService.refreshToken(req);
  }

  @Post('register')
  @ApiOperation({ summary: 'Création de compte', description: 'Crée un nouveau compte utilisateur.' })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Compte créé avec succès' })
  @ApiConflictResponse({ description: 'Un compte avec cet email existe déjà' })
  async register(@Body() data: RegisterUserDto) {
    return this.authService.register(data);
  }
}
