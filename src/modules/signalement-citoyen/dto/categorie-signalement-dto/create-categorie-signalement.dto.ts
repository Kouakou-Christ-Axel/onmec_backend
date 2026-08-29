import { CategorieSignalementDto } from './categorie-signalement.dto';

// Classe vide plutôt qu'un alias `= CategorieSignalementDto` : le schéma
// OpenAPI publié (docs/openapi.json) référence `CreateCategorieSignalementDto`
// par son propre nom, qu'un simple alias de type ferait disparaître.
export class CreateCategorieSignalementDto extends CategorieSignalementDto {}