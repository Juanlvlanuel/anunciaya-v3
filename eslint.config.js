import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.js', '**/*.cjs', '!eslint.config.js']
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off'
    }
  },
  // React Hooks (apps de React). Registra las reglas para que los `eslint-disable
  // react-hooks/*` del código sean válidos (antes daban "rule not found").
  // Ambas en 'warn': dan visibilidad de deps faltantes y hooks mal nombrados SIN romper
  // el lint (había issues preexistentes, varios falsos positivos de naming `_useX`).
  // Subir a 'error' es un saneo aparte, una vez depurados esos casos.
  {
    files: ['apps/web/**/*.{ts,tsx}', 'apps/admin/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
);
