import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';
import { NotificationController } from './notification.controller';
import { DeviceService } from './device/device.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, PushService, DeviceService],
  // Expose aux modules qui emettent des notifications (actualites, engagement,
  // signalements). Nest instancie ce module une seule fois : l'initialisation
  // Firebase du constructeur n'est pas rejouee a chaque import.
  exports: [NotificationService],
})
export class NotificationModule {
  constructor(configService: ConfigService) {
    // Firebase leve sur une double initialisation. La garde rend le module sur
    // a importer depuis plusieurs endroits et a instancier dans les tests.
    if (admin.apps.length > 0) return;

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: configService.getOrThrow<string>('FIREBASE_PROJECT_ID'),
        clientEmail: configService.getOrThrow<string>('FIREBASE_CLIENT_EMAIL'),
        privateKey: configService
          .getOrThrow<string>('FIREBASE_PRIVATE_KEY')
          // La variable d'environnement porte les sauts de ligne echappes :
          // sans cette conversion, Firebase rejette la cle (« Too few bytes to
          // parse DER »).
          .replace(/\\n/g, '\n'),
      }),
    });
  }
}
