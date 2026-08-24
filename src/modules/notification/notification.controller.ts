import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticatedActor } from '../../common/types/authenticated-actor';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';
import { DeviceService } from './device/device.service';
import { DeleteDeviceDto, DeviceDto } from './dto/device.dto';
import {
  MultipleDeviceNotificationDto,
  NotificationDto,
  NotificationListQueryDto,
  NotificationResponseDto,
  PaginatedNotificationsDto,
  TopicNotificationDto,
} from './dto/notification.dto';

/**
 * Notifications.
 *
 * Ce contrôleur n'avait AUCUNE garde : `send-notification`,
 * `send-multiple-notifications` et `send-topic-notification` étaient ouverts à
 * Internet, permettant à quiconque d'envoyer une push à un jeton arbitraire ou
 * à un topic entier. `register-device` acceptait de surcroît un `userId` dans
 * le corps de requête, donc de rattacher un appareil au compte d'un tiers.
 */
@ApiTags('Notifications')
@Controller('notification')
export class NotificationController {
  constructor(
    private readonly notifications: NotificationService,
    private readonly push: PushService,
    private readonly deviceService: DeviceService,
  ) {}

  // ─── Fil in-app du membre ──────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Lister ses notifications',
    description:
      "Fil du compte authentifié, du plus récent au plus ancien. `nonLues` compte les non lues quel que soit le filtre appliqué.",
  })
  @ApiOkResponse({ type: PaginatedNotificationsDto })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  lister(
    @CurrentUser() user: AuthenticatedActor,
    @Query() query: NotificationListQueryDto,
  ) {
    return this.notifications.lister(user.id, query);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Compter ses notifications non lues',
    description: 'Destiné à la pastille de l’interface.',
  })
  @ApiOkResponse({ schema: { properties: { nonLues: { type: 'number' } } } })
  compterNonLues(@CurrentUser() user: AuthenticatedActor) {
    return this.notifications.compterNonLues(user.id);
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Marquer toutes ses notifications comme lues' })
  @ApiOkResponse({ schema: { properties: { marquees: { type: 'number' } } } })
  marquerToutesLues(@CurrentUser() user: AuthenticatedActor) {
    return this.notifications.marquerToutesLues(user.id);
  }

  // Déclaré après `read-all` et `unread-count` : sinon `:id` capterait ces deux
  // chemins avant qu'ils ne soient atteints.
  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Marquer une notification comme lue',
    description:
      'Idempotent. Une notification appartenant à un autre membre renvoie 404, pas 403.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiNotFoundResponse({ description: 'Notification introuvable' })
  marquerLue(
    @CurrentUser() user: AuthenticatedActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.marquerLue(user.id, id);
  }

  // ─── Appareils ─────────────────────────────────────────────────────────────

  @Post('register-device')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Enregistrer un appareil pour recevoir les notifications push',
    description:
      "Le `userId` du corps de requête est ignoré : le compte est toujours déduit du jeton. Un appel non authentifié reste accepté mais enregistre un appareil non rattaché, qui ne recevra aucune notification personnelle — l'application doit envoyer son jeton.",
  })
  @ApiResponse({ status: 201, description: 'Appareil enregistré' })
  registerDevice(
    @Body() deviceDto: DeviceDto,
    @CurrentUser() user?: AuthenticatedActor,
  ) {
    // Seuls les membres ont un fil : un jeton d'admin ne doit pas rattacher
    // l'appareil, `DeviceToken.userId` référençant la table `members`.
    const userId = user?.type === 'member' ? user.id : null;
    return this.deviceService.registerDevice(deviceDto, userId);
  }

  @Post('delete-device')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Supprimer un appareil des notifications push',
    description:
      "Un membre authentifié ne peut retirer qu'un appareil rattaché à son compte ou non rattaché.",
  })
  @ApiResponse({ status: 200, description: 'Appareil supprimé' })
  deleteDevice(
    @Body() deleteDeviceDto: DeleteDeviceDto,
    @CurrentUser() user?: AuthenticatedActor,
  ) {
    const userId = user?.type === 'member' ? user.id : null;
    return this.deviceService.deleteDevice(deleteDeviceDto, userId);
  }

  // ─── Envoi direct (back-office) ────────────────────────────────────────────
  //
  // Conservés pour les envois exceptionnels décidés au back-office. Les
  // notifications liées au produit ne passent plus par là : elles sont émises
  // côté serveur par NotificationService, à la publication d'une actualité, au
  // changement de statut d'un signalement, etc.

  @Post('send-notification')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Envoyer une push à un appareil (back-office)',
  })
  @ApiResponse({ status: 201, description: 'Notification envoyée' })
  @ApiUnauthorizedResponse({ description: 'Non authentifié' })
  @ApiForbiddenResponse({ description: 'Réservé au back-office' })
  sendNotification(@Body() body: NotificationDto) {
    return this.push.sendNotification(body);
  }

  @Post('send-multiple-notifications')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Envoyer une push à plusieurs appareils (back-office)',
  })
  @ApiResponse({ status: 201, description: 'Notifications envoyées' })
  @ApiForbiddenResponse({ description: 'Réservé au back-office' })
  sendMultipleNotifications(@Body() body: MultipleDeviceNotificationDto) {
    return this.push.sendNotificationToMultipleTokens(body);
  }

  @Post('send-topic-notification')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Envoyer une push à un topic (back-office)',
    description:
      "Diffusion à tous les abonnés du topic. Réservé à l'Administrateur national via AdminGuard.",
  })
  @ApiOkResponse({ description: 'Notification de topic envoyée' })
  @ApiForbiddenResponse({ description: 'Réservé au back-office' })
  sendTopicNotification(@Body() body: TopicNotificationDto) {
    return this.push.sendTopicNotification(body);
  }
}
