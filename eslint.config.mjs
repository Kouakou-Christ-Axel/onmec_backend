// @ts-check
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Configuration ESLint (format « flat », requis depuis ESLint 9).
 *
 * Le dépôt embarquait toutes les dépendances ESLint 9 mais aucun fichier de
 * configuration : `pnpm lint` échouait donc systématiquement, et rien ne
 * lintait ce code. C'est ce qui explique qu'aucune règle ne soit respectée
 * uniformément aujourd'hui.
 *
 * Deux choix délibérés pour que ce garde-fou soit adoptable tout de suite :
 *
 * 1. Pas de `recommendedTypeChecked`. Les règles typées (no-unsafe-*,
 *    no-floating-promises) sont précieuses mais produisent des milliers de
 *    remontées sur une base qui n'a jamais été lintée. À activer par un
 *    chantier dédié.
 * 2. Pas de `eslint-plugin-prettier`. Le formatage reste du ressort de
 *    `pnpm format` ; le faire remonter en erreur de lint noierait les vrais
 *    défauts sous des différences d'indentation.
 */
export default tseslint.config(
  {
    ignores: [
      // Client Prisma généré : ni écrit ni relu à la main.
      'src/generated/**',
      'dist/**',
      'coverage/**',
      'eslint.config.mjs',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: 'module',
    },
    rules: {
      // Le code applicatif manipule beaucoup de formes Prisma dynamiques
      // (agrégats, groupBy indexés) où `any` est le choix pragmatique.
      '@typescript-eslint/no-explicit-any': 'off',
      // Les paramètres inutilisés préfixés par _ sont une convention explicite.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
