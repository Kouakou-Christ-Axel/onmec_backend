import { PartialType } from '@nestjs/swagger';
import { CategorieSignalementDto } from './categorie-signalement.dto';

export class UpdateCategorieSignalementDto extends PartialType(CategorieSignalementDto) {}