import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSignalementCitoyenDto } from './create-signalement-citoyen.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSignalementCitoyenDto extends PartialType(CreateSignalementCitoyenDto) {
  @ApiPropertyOptional({
    description: 'Indique si le signalement a été validé par un administrateur',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  validation?: boolean;
}
