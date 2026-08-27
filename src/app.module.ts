import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CommonModule } from 'src/common/common.module';
import { UsersModule } from 'src/modules/users/users.module';
import { AdminsModule } from 'src/modules/admins/admins.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { JsonWebTokenModule } from 'src/json-web-token/json-web-token.module';
import { validateEnv } from 'src/config/env.validation';
import { LibrairieModule } from './modules/librairie/librairie.module';
import { SignalementCitoyenModule } from './modules/signalement-citoyen/signalement-citoyen.module';
import { QuizzModule } from './modules/quizz/quizz.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ActualitesModule } from './modules/actualites/actualites.module';
import { EngagementModule } from './modules/engagement/engagement.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    JsonWebTokenModule,
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Plafond global de repli. Les routes sensibles (connexion, inscription,
    // envoi d'OTP) posent leur propre `@Throttle`, nettement plus serré.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    DatabaseModule,
    CommonModule,
    UsersModule,
    AdminsModule,
    AuthModule,
    LibrairieModule,
    SignalementCitoyenModule,
    QuizzModule,
    NotificationModule,
    ActualitesModule,
    EngagementModule,
    GamificationModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
