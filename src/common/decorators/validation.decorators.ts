import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Champ email normalise.
 *
 * `trim()` + `toLowerCase()` sont appliques PARTOUT. Auparavant, /auth/register
 * ne faisait que `trim()` alors que /auth/verify-email faisait aussi
 * `toLowerCase()` : un compte cree avec « Jean@GMAIL.com » devenait
 * introuvable a la verification, donc definitivement inutilisable.
 */
export function IsEmailField(description = 'Adresse email') {
  return applyDecorators(
    ApiProperty({
      description,
      example: 'jean.dupont@example.com',
      required: true,
      maxLength: 254,
    }),
    IsNotEmpty({ message: "L'adresse email est obligatoire" }),
    MaxLength(254),
    IsEmail({}, { message: 'Adresse email invalide' }),
    Transform(({ value }) =>
      typeof value === 'string' ? value.trim().toLowerCase() : value,
    ),
  );
}

/**
 * Champ mot de passe "en clair" (saisie a comparer, pas a nouveau creee) :
 * pas de politique de format, juste present et sans espaces parasites. Utilise
 * pour le mot de passe de connexion et l'ancien mot de passe d'un changement —
 * la politique de force s'applique a la creation, pas a la relecture d'un mot
 * de passe deja existant (voir IsStrongPassword).
 */
export function IsPasswordField(description = 'Mot de passe', example?: string) {
  return applyDecorators(
    ApiProperty({
      description,
      required: true,
      ...(example ? { example } : {}),
    }),
    IsNotEmpty(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
  );
}

// Au moins une majuscule, un chiffre et un caractere special.
const PASSWORD_PATTERN =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;':".,<>?/\\]).+$/;

/**
 * Politique de mot de passe.
 *
 * Le plafond passe de 15 a 128 caracteres : l'ancien `@MaxLength(15)`
 * interdisait les phrases de passe et les gestionnaires de mots de passe,
 * ce qui affaiblissait les comptes au lieu de les proteger.
 */
export function IsStrongPassword(description = 'Mot de passe') {
  return applyDecorators(
    ApiProperty({
      description,
      example: 'MonMotDePasse!2026',
      required: true,
      minLength: 12,
      maxLength: 128,
    }),
    IsNotEmpty({ message: 'Le mot de passe est obligatoire' }),
    MinLength(12, {
      message: 'Le mot de passe doit contenir au moins 12 caractères',
    }),
    MaxLength(128),
    Matches(PASSWORD_PATTERN, {
      message:
        'Le mot de passe doit contenir au moins une majuscule, un chiffre et un caractère spécial.',
    }),
  );
}
