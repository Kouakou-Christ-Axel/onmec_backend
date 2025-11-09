import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/services/prisma.service';
import { DeleteDeviceDto, DeviceDto } from '../dto/device.dto';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);
  constructor(private readonly prismaService: PrismaService) {}

  async registerDevice(deviceDto: DeviceDto) {
    const { token, userId, platform } = deviceDto;
    this.logger.log({
      message: 'Registering device',
      token,
      userId,
      platform,
    });
    try {
      const existingDevice = await this.prismaService.deviceToken.findUnique({
        where: { token },
      });

      if (existingDevice) {
        this.logger.log({
          message: 'Device already registered',
          token,
        });
        return existingDevice;
      }

      const newDevice = await this.prismaService.deviceToken.create({
        data: {
          token,
          userId,
          platform,
        },
      });

      this.logger.log({
        message: 'Device registered successfully',
        token,
      });
      return newDevice;
    } catch (error) {
      this.logger.error('Error registering device', error);
      throw error;
    }
  }

  async deleteDevice(deleteDeviceDto: DeleteDeviceDto) {
    const { token } = deleteDeviceDto;
    this.logger.log({
      message: 'Deleting device',
      token,
    });
    try {
      const deletedDevice = await this.prismaService.deviceToken.delete({
        where: { token },
      });

      this.logger.log({
        message: 'Device deleted successfully',
        token,
      });
      return deletedDevice;
    } catch (error) {
      this.logger.error('Error deleting device', error);
      throw error;
    }
  }
}
