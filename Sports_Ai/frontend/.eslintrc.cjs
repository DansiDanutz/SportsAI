/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    // TypeScript already enforces this repo's strict unused rules via tsc
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    // React 17+ / new JSX transform doesn't require React in scope
    'react/react-in-jsx-scope': 'off',
    // This codebase uses `any` in a few boundary areas; keep lint usable
    '@typescript-eslint/no-explicit-any': 'off',
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',
  },
};

