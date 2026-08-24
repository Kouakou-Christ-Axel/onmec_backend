import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/services/prisma.service';
import { DeleteDeviceDto, DeviceDto } from '../dto/device.dto';
import { isPrismaError } from '../../../common/utils/prisma-error';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Enregistre ou rattache un appareil.
   *
   * `userId` vient du jeton et jamais du corps de requete : la version
   * precedente le lisait dans le DTO sur un endpoint sans aucune garde, donc
   * n'importe qui pouvait rattacher un appareil au compte d'un tiers et
   * recevoir ses notifications.
   *
   * Un appareil deja connu est re-rattache plutot qu'ignore : c'est le cas
   * normal quand un membre se connecte sur un telephone qui servait a un autre.
   */
  async registerDevice(deviceDto: DeviceDto, userId: string | null) {
    const { token, platform } = deviceDto;
    this.logger.log({ message: 'Registering device', userId, platform });

    return this.prismaService.deviceToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { token, userId, platform },
    });
  }

  /**
   * Retire un appareil.
   *
   * Un membre authentifie ne peut retirer qu'un appareil qui lui appartient ou
   * qui n'est rattache a personne. Un appel anonyme ne peut retirer qu'un
   * appareil non rattache -- sinon, connaitre un jeton d'appareil suffirait a
   * couper les notifications de son proprietaire.
   */
  async deleteDevice(deleteDeviceDto: DeleteDeviceDto, userId: string | null) {
    const { token } = deleteDeviceDto;

    const appareil = await this.prismaService.deviceToken.findUnique({
      where: { token },
    });
    if (!appareil) {
      throw new NotFoundException('Appareil introuvable');
    }
    if (appareil.userId !== null && appareil.userId !== userId) {
      throw new ForbiddenException(
        'Cet appareil est rattaché à un autre compte',
      );
    }

    try {
      return await this.prismaService.deviceToken.delete({ where: { token } });
    } catch (error) {
      // Suppression concurrente : la cible a disparu entre la lecture et la
      // suppression, le resultat voulu est atteint.
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException('Appareil introuvable');
      }
      throw error;
    }
  }
}
