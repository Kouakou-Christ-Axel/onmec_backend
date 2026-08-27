import { Prisma } from '../../generated/prisma/client';

/**
 * Teste le code d'erreur d'une exception Prisma.
 *
 * Les codes utilises dans ce depot :
 *  - `P2002` violation d'une contrainte d'unicite
 *  - `P2025` l'enregistrement vise par un update/delete n'existe pas
 *
 * Regrouper le test ici evite de repeter le `instanceof` a chaque appel et,
 * surtout, de comparer `error.code` sur un `any` : sans le `instanceof`, une
 * erreur reseau portant un champ `code` (ECONNREFUSED) serait silencieusement
 * confondue avec une erreur metier.
 */
export function isPrismaError(
  error: unknown,
  code: 'P2002' | 'P2025',
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}
