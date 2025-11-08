import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from 'src/common/common.module';
import { UsersModule } from 'src/modules/users/users.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JsonWebTokenModule } from 'src/json-web-token/json-web-token.module';
import { SimpleStorageModule } from './modules/simple-storage/simple-storage.module';
import { ImageProcessingModule } from './modules/image-processing/image-processing.module';
import { LibrairieModule } from './modules/librairie/librairie.module';
import { SignalementCitoyenModule } from './modules/signalement-citoyen/signalement-citoyen.module';

@Module({
  imports: [
    JsonWebTokenModule,
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({}),
    DatabaseModule,
    CommonModule,
    UsersModule,
    AuthModule,
    SimpleStorageModule,
    ImageProcessingModule,
    LibrairieModule,
    SignalementCitoyenModule,
  ],
})
export class AppModule {}
