import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JsonWebTokenService {
  private readonly secret: string;
  private readonly refreshSecret: string;
  private readonly tokenExpiration: string;
  private readonly refreshExpiration: string;
  private readonly customerSecret: string;
  private readonly customerExpiration: string;
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.secret = this.configService.getOrThrow<string>('TOKEN_SECRET') ?? '';
    this.refreshSecret =
      this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET') ?? '';
    this.tokenExpiration =
      this.configService.get<string>('TOKEN_EXPIRATION') ?? '';
    this.refreshExpiration =
      this.configService.get<string>('REFRESH_TOKEN_EXPIRATION') ?? '';
    this.customerSecret =
      this.configService.get<string>('CUSTOMER_TOKEN_SECRET') ?? '';
    this.customerExpiration =
      this.configService.get<string>('CUSTOMER_TOKEN_EXPIRATION') ?? '';
  }

  // GENERATE TOKEN
  async generateToken(userId: string) {
    const payload = { sub: userId };

    return await this.jwtService.signAsync(payload, {
      secret: this.secret,
      expiresIn: this.tokenExpiration,
    });
  }

  // GENERATE REFRESH TOKEN
  async generateRefreshToken(userId: string) {
    const payload = { sub: userId };

    return await this.jwtService.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiration,
    });
  }

  async verifyToken(token: string, type: 'user' | 'customer') {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: type === 'user' ? this.secret : this.customerSecret,
      });
    } catch (error) {
      throw new UnauthorizedException('Token invalide');
    }
  }
}
