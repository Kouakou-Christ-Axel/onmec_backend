import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { LoginUserDto } from 'src/modules/auth/dto/login-user.dto';
import {
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtRefreshAuthGuard } from '../guards/jwt-refresh-auth.guard';
import { RegisterUserDto } from '../dto/register-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // LOGIN USER
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiOkResponse({
    type: String,
    description: 'Utilisateur, Token et refreshToken envoyé',
  })
  @ApiNotFoundResponse({ description: 'Utilisateur non trouvé' })
  @ApiBody({ type: LoginUserDto })
  @Post('login')
  async login(@Body() data: LoginUserDto) {
    return this.authService.login(data);
  }

  // REFRESH TOKEN
  @ApiOperation({ summary: 'Rafraichissement du token utilisateur' })
  @ApiOkResponse({
    type: String,
    description: 'Token envoyé',
  })
  @ApiNotFoundResponse({
    description: 'Utilisateur non trouvé',
  })
  @UseGuards(JwtRefreshAuthGuard)
  @Get('refresh-token')
  async refreshToken(@Req() req: Request) {
    return this.authService.refreshToken(req);
  }

  // Register
  @ApiOperation({ summary: 'Enregistrement utilisateur' })
  @ApiOkResponse({
    type: String,
    description: 'Utilisateur enregistré',
  })
  @ApiNotFoundResponse({ description: 'Erreur lors de l\'enregistrement' })
  @ApiBody({ type: RegisterUserDto })
  @Post('register')
  async register(@Body() data: RegisterUserDto) {
    return this.authService.register(data);
  }
}
