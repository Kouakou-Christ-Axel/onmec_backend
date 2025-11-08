import { PartialType } from '@nestjs/swagger';
import { CreateCategorieSignalementDto } from './create-categorie-signalement.dto';

export class UpdateCategorieSignalementDto extends PartialType(CreateCategorieSignalementDto) {}