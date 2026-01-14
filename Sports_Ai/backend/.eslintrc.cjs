/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    node: true,
    es2020: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    // TypeScript already enforces this repo's strict unused rules via tsc
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    // This codebase uses `any` in boundary/controller areas; keep lint usable
    '@typescript-eslint/no-explicit-any': 'off',
  },
};

