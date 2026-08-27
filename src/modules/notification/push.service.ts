import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  MultipleDeviceNotificationDto,
  NotificationDto,
  TopicNotificationDto,
} from './dto/notification.dto';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private avertissementEmis = false;

  /**
   * Firebase est facultatif (voir NotificationModule). Sans application
   * initialisee, `admin.messaging()` leve — et comme les envois sont declenches
   * sans `await` par NotificationService, le rejet serait non capture.
   *
   * L'avertissement n'est emis qu'une fois : une diffusion a tous les membres
   * appelle cette methode par lots.
   */
  private pushIndisponible(): boolean {
    if (admin.apps.length > 0) return false;
    if (!this.avertissementEmis) {
      this.avertissementEmis = true;
      this.logger.warn(
        'Firebase non configure : envoi push ignore (le fil in-app reste ecrit).',
      );
    }
    return true;
  }

  async sendNotification({ token, title, body, icon }: NotificationDto) {
    if (this.pushIndisponible()) return null;

    this.logger.log({
      message: 'Sending notification',
      title,
      token,
    });
    try {
      return await admin.messaging().send({
        token,
        webpush: {
          notification: {
            title,
            body,
            icon,
          },
        },
      });
    } catch (error) {
      this.logger.error('Error sending notification', error);
      throw error;
    }
  }

  async sendNotificationToMultipleTokens({
    tokens,
    title,
    body,
    icon,
  }: MultipleDeviceNotificationDto) {
    if (this.pushIndisponible()) {
      return { success: false, message: 'Firebase non configure' };
    }
    this.logger.log({
      message: 'Sending notifications to multiple tokens',
      title,
      tokensCount: tokens.length,
    })
    const message = {
      notification: {
        title,
        body,
        icon,
      },
      tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log({
        message: 'Successfully sent messages',
        successCount: response.successCount,
        failureCount: response.failureCount,
      })
      return {
        success: true,
        message: `Successfully sent ${response.successCount} messages; ${response.failureCount} failed.`,
      };
    } catch (error) {
      this.logger.error('Error sending messages', error);
      return { success: false, message: 'Failed to send notifications' };
    }
  }

  async sendTopicNotification({
    topic,
    title,
    body,
    icon,
  }: TopicNotificationDto) {
    if (this.pushIndisponible()) {
      return { success: false, message: 'Firebase non configure' };
    }
    const message = {
      notification: {
        title,
        body,
        icon,
      },
      topic,
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log({
        message: 'Successfully sent topic message',
        response,
      });
      return { success: true, message: 'Topic notification sent successfully' };
    } catch (error) {
      this.logger.error('Error sending topic message', error);
      return { success: false, message: 'Failed to send topic notification' };
    }
  }
}
