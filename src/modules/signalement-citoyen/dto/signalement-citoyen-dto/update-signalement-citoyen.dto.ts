import { PartialType } from '@nestjs/swagger';
import { CreateSignalementCitoyenDto } from './create-signalement-citoyen.dto';

export class UpdateSignalementCitoyenDto extends PartialType(CreateSignalementCitoyenDto) {
  validation?: boolean;
}
