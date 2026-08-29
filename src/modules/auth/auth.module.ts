import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AdminAuthService } from './services/admin-auth.service';
import { AuthController } from './controllers/auth.controller';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JsonWebTokenModule } from 'src/json-web-token/json-web-token.module';
import { EmailService } from './services/email.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';

@Module({
  imports: [JsonWebTokenModule],
  controllers: [AuthController, AdminAuthController],
  providers: [
    AuthService,
    AdminAuthService,
    EmailService,
    JwtStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
    JwtRefreshAuthGuard,
    OptionalJwtAuthGuard,
    AdminGuard,
    AdminRolesGuard,
  ],
})
export class AuthModule {}
