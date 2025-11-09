import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DeviceDto {
  @ApiProperty({
    type: String,
    description: "Client device token",
  })
  @IsString()
  token: string;

  @ApiProperty({
    type: String,
    description: "User ID associated with the device",
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    type: String,
    description: "Platform of the device (e.g., 'ios', 'android', 'web')",
  })
  @IsString()
  platform: string;
}

export class DeleteDeviceDto extends PickType(DeviceDto, ['token']){}