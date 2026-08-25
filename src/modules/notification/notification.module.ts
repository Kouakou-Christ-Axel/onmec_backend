import { Logger, Module } from '@nestjs/common';
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
  private readonly logger = new Logger(NotificationModule.name);

  constructor(configService: ConfigService) {
    // Firebase leve sur une double initialisation. La garde rend le module sur
    // a importer depuis plusieurs endroits et a instancier dans les tests.
    if (admin.apps.length > 0) return;

    const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = configService.get<string>('FIREBASE_PRIVATE_KEY');

    // Configuration facultative : sans elle, le fil in-app continue d'etre
    // alimente et seul l'envoi push est neutralise. Le `getOrThrow` d'avant
    // empechait toute l'application de demarrer faute de compte Firebase.
    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Configuration Firebase incomplete : notifications push desactivees. ' +
          'Le fil in-app reste alimente.',
      );
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey
          // La variable d'environnement porte les sauts de ligne echappes :
          // sans cette conversion, Firebase rejette la cle (« Too few bytes to
          // parse DER »).
          .replace(/\\n/g, '\n'),
      }),
    });
    this.logger.log(`Firebase initialise (projet ${projectId})`);
  }
}
