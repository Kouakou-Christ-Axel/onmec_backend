import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  MultipleDeviceNotificationDto,
  NotificationDto,
  TopicNotificationDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  async sendNotification({ token, title, body, icon }: NotificationDto) {
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
