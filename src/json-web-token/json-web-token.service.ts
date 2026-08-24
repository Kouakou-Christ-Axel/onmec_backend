import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from 'src/common/types/authenticated-actor';

@Injectable()
export class JsonWebTokenService {
  private readonly secret: string;
  private readonly refreshSecret: string;
  private readonly tokenExpiration: string;
  private readonly refreshExpiration: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.secret = this.configService.getOrThrow<string>('TOKEN_SECRET');
    this.refreshSecret =
      this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET');

    // `getOrThrow` et non `get(...) ?? ''` : une chaine vide passee a
    // `expiresIn` produit un token SANS expiration. Mieux vaut refuser de
    // demarrer que d'emettre des JWT eternels.
    this.tokenExpiration =
      this.configService.getOrThrow<string>('TOKEN_EXPIRATION');
    this.refreshExpiration = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_EXPIRATION',
    );
  }

  async generateToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.secret,
      expiresIn: this.tokenExpiration,
    });
  }

  async generateRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiration,
    });
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.secret,
      });
    } catch {
      throw new UnauthorizedException('Token invalide');
    }
  }
}
