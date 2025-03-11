import { dirname } from 'path';
import { fileURLToPath } from 'url';

import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);

// Base configuration for all files
const baseConfig = {
  languageOptions: {
    globals: {
      ...globals.node,
      ...globals.jest,
    },
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: {
    import: importPlugin,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
        alwaysTryTypes: true,
      },
    },
  },
  rules: {
    // Import rules
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
        pathGroups: [
          {
            pattern: '@/**',
            group: 'internal',
            position: 'after',
          },
        ],
      },
    ],
    'import/no-duplicates': 'error',
    'import/no-unresolved': 'warn',
    // Enforce absolute imports with @/ prefix instead of relative paths
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../*', './*'],
            message: 'Use absolute imports with @/ prefix instead of relative imports',
          },
        ],
      },
    ],

    // General rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    eqeqeq: ['error', 'always'],
    'prefer-const': 'error',
    'no-var': 'error',
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: false }],
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: '*', next: '*' },
      {
        blankLine: 'any',
        prev: ['import', 'cjs-import'],
        next: ['import', 'cjs-import'],
      },
      {
        blankLine: 'any',
        prev: ['export', 'cjs-export'],
        next: ['export', 'cjs-export'],
      },
    ],
  },
  ignores: ['dist/**', 'node_modules/**', 'test-projects/**'],
};

// TypeScript specific configuration
const tsConfig = {
  files: ['**/*.ts'],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      project: './tsconfig.json',
      tsconfigRootDir: __dirname,
    },
  },
  plugins: {
    '@typescript-eslint': tseslint,
  },
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-argument': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    // Disable the base rule as it can report incorrect errors in TypeScript files
    'no-unused-vars': 'off',
    // Use the TypeScript-specific rule instead
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        // Pattern for function parameters and type parameters
        // argsIgnorePattern: '^_|^item$|^index$',
        // Pattern for variables
        varsIgnorePattern: '^_',
        // Ignore rest siblings in destructuring
        ignoreRestSiblings: true,
        // Allow unused parameters in array destructuring
        // destructuredArrayIgnorePattern: '^_|^item$|^index$',
        // This is critical for type definitions
        caughtErrors: 'none',
      },
    ],
    '@typescript-eslint/consistent-type-imports': 'warn',
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/await-thenable': 'warn',
    '@typescript-eslint/no-misused-promises': 'warn',
    '@typescript-eslint/unbound-method': 'warn',
    '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
  },
};

// Test files configuration
const testConfig = {
  files: ['**/*.test.ts', '**/*.spec.ts'],
  rules: {
    'no-console': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/unbound-method': 'off',
  },
};

export default [js.configs.recommended, baseConfig, tsConfig, testConfig];
