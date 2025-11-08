import { PickType } from '@nestjs/swagger';
import { CategorieSignalementDto } from './categorie-signalement.dto';

export class CreateCategorieSignalementDto extends PickType(
  CategorieSignalementDto,
  ['nom', 'description', 'validationObligatoire'],
) {}