export default function slugify(text: string): string{
  return text
    .toString()
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques (accents)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Espaces -> -
    .replace(/[^a-z0-9\-]/g, '') // Garde uniquement a-z, 0-9 et -
    .replace(/--+/g, '-') // Plusieurs - -> un seul -
    .replace(/^-+|-+$/g, '');
}