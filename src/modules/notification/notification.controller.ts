import { Body, Controller, Post } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  MultipleDeviceNotificationDto,
  TopicNotificationDto,
} from './dto/notification.dto';
import { DeleteDeviceDto, DeviceDto } from './dto/device.dto';
import { DeviceService } from './device/device.service';

@Controller('notification')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly deviceService: DeviceService
  ) {}

  @Post('register-device')
  @ApiOperation({ summary: "Enregistrer un appareil pour recevoir les notifications push" })
  @ApiResponse({ status: 201, description: 'Device registered successfully' })
  async registerDevice(
    @Body() deviceDto: DeviceDto,
  ) {
    return this.deviceService.registerDevice(deviceDto);
  }

  @Post('delete-device')
  @ApiOperation({ summary: "Supprimer un appareil des notifications push" })
  @ApiResponse({ status: 200, description: 'Device deleted successfully' })
  async deleteDevice(
    @Body() deleteDeviceDto: DeleteDeviceDto,
  ) {
    return this.deviceService.deleteDevice(deleteDeviceDto);
  }

  @Post('send-notification')
  @ApiOperation({
    summary: 'Envoyez une notification push à un appareil spécifique'
  })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  async sendNotification(
    @Body() body: { token: string; title: string; body: string; icon: string },
  ) {
    return this.notificationService.sendNotification({
      token: body.token,
      title: body.title,
      body: body.body,
      icon: body.icon,
    });
  }

  @Post('send-multiple-notifications')
  @ApiOperation({
    summary: 'Envoyez une notification push à plusieurs appareils en même temps'
  })
  @ApiResponse({ status: 200, description: 'Notifications sent successfully' })
  async sendMultipleNotifications(@Body() body: MultipleDeviceNotificationDto) {
    return this.notificationService.sendNotificationToMultipleTokens({
      tokens: body.tokens,
      title: body.title,
      body: body.body,
      icon: body.icon,
    });
  }

  @Post('send-topic-notification')
  @ApiOperation({
    summary: 'Envoyez une notification push à tous les appareils abonnés à un sujet spécifique'
  })
  @ApiResponse({
    status: 200,
    description: 'Topic notification sent successfully',
  })
  async sendTopicNotification(@Body() body: TopicNotificationDto) {
    return this.notificationService.sendTopicNotification({
      topic: body.topic,
      title: body.title,
      body: body.body,
      icon: body.icon,
    });
  }
}
