import { Injectable } from '@nestjs/common';
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
    // `expiresIn` produit un token SANS expiration. Ces deux variables ont
    // desormais un defaut (15m / 7d, voir src/config/env.validation.ts) : le
    // `getOrThrow` ne sert plus a exiger le `.env`, il verifie que la couche
    // de defauts a bien tourne. Ne pas le rabaisser en `get(...) ?? ...`.
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
}
