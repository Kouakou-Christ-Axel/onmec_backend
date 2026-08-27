import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DeviceDto {
  @ApiProperty({
    type: String,
    description: "Client device token",
  })
  @IsString()
  token: string;

  // Champ conservé mais ignoré : le compte rattaché est toujours déduit du
  // jeton d'authentification. Il reste déclaré parce que le ValidationPipe
  // global tourne avec `forbidNonWhitelisted` — le retirer ferait passer en
  // 400 les clients déjà déployés qui l'envoient encore.
  @ApiPropertyOptional({
    type: String,
    deprecated: true,
    description:
      "Ignoré. Le compte rattaché est déduit du jeton d'authentification.",
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