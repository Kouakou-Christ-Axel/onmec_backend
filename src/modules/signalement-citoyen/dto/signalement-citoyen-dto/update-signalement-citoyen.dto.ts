import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSignalementCitoyenDto } from './create-signalement-citoyen.dto';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { StatutSignalement } from '../../../../generated/prisma/client';

export class UpdateSignalementCitoyenDto extends PartialType(CreateSignalementCitoyenDto) {
  @ApiPropertyOptional({
    description: 'Indique si le signalement a été validé par un administrateur',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  validation?: boolean;

  @ApiPropertyOptional({
    description: 'Statut du signalement',
    enum: StatutSignalement,
    example: StatutSignalement.EN_COURS,
  })
  @IsOptional()
  @IsEnum(StatutSignalement, {
    message: 'Le statut doit être une valeur valide',
  })
  statut?: StatutSignalement;
}
