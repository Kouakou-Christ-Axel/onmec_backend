import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { ConfigService } from '@nestjs/config';
import { DeviceService } from './device/device.service';
import * as admin from "firebase-admin";

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, DeviceService],
})
export class NotificationModule {
  constructor(configService: ConfigService) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: configService.getOrThrow<string>('FIREBASE_PROJECT_ID'),
        clientEmail: configService.getOrThrow<string>('FIREBASE_CLIENT_EMAIL'),
        privateKey: configService.getOrThrow<string>('FIREBASE_PRIVATE_KEY')
          .replace(/\\n/g, '\n'),
      }),
    })
  }
}
