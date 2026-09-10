import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { ignores: ['.next/**', 'node_modules/**', 'scripts/**'] },
  {
    rules: {
      // Legacy helpers lean on `any` around Prisma; tighten module by module.
      '@typescript-eslint/no-explicit-any': 'off',
      // French copy in JSX uses apostrophes everywhere; escaping them hurts readability.
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
