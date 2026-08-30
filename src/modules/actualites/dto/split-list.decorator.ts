import { Transform } from 'class-transformer';

/**
 * Découpe une liste envoyée soit en champ répété, soit en chaîne séparée par
 * des virgules — les deux formes que peuvent produire une requête multipart
 * ou une querystring. Sans ce découpage, `tags=sante,education` arriverait
 * comme un unique élément littéral.
 */
export function SplitList() {
  return Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const brut = Array.isArray(value) ? value : String(value).split(',');
    const propres = brut.map((t) => String(t).trim()).filter(Boolean);
    return propres.length ? propres : undefined;
  });
}
