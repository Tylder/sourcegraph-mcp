// eslint.config.js - 2025 Edition
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Latest JavaScript recommendations
  js.configs.recommended,

  // Latest strict TypeScript rules for 2025
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      // ===== TYPE SAFETY & ERROR PREVENTION (2025 Priority) =====
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-unary-minus': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-meaningless-void-operator': 'error',

      // ===== MODERN CODE STYLE (2025 Standards) =====
      '@typescript-eslint/prefer-destructuring': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/prefer-literal-enum-member': 'error',
      '@typescript-eslint/prefer-ts-expect-error': 'error',
      '@typescript-eslint/unified-signatures': 'error',

      // ===== PERFORMANCE & EFFICIENCY =====
      '@typescript-eslint/no-for-in-array': 'error',
      '@typescript-eslint/prefer-find': 'error',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/no-dynamic-delete': 'error',

      // ===== MODERN JAVASCRIPT FEATURES =====
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'template-curly-spacing': 'error',
      'arrow-spacing': 'error',

      // ===== CODE FORMATTING (Consistent with Prettier) =====
      'comma-dangle': ['error', 'always-multiline'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
      'no-multiple-empty-lines': ['error', { max: 1 }],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'computed-property-spacing': ['error', 'never'],
      'func-call-spacing': ['error', 'never'],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'keyword-spacing': 'error',
      'space-before-blocks': 'error',
      'space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': 'error',
      'space-unary-ops': 'error',
      'spaced-comment': ['error', 'always'],
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'comma-spacing': ['error', { before: false, after: true }],
      'comma-style': ['error', 'last'],
      'curly': ['error', 'all'],
      'dot-notation': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],

      // ===== SECURITY & RELIABILITY =====
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-alert': 'error',
      'no-debugger': 'error',
      'no-console': 'warn',
      'no-throw-literal': 'error',

      // ===== IMPORT/ECOSYSTEM RULES =====
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-duplicate-imports': 'error',

      // ===== 2025 ENHANCED RULES =====
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'error',
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      '@typescript-eslint/no-duplicate-type-constituents': 'error',
      '@typescript-eslint/no-extra-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/restrict-plus-operands': 'error',
      '@typescript-eslint/return-await': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      // ===== DISABLED RULES (Too Restrictive for 2025) =====
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },

  // Test files - Minimal relaxation for dynamic typing
  {
    files: ['tests/**/*'],
    rules: {
      // Keep most strict rules for tests
      '@typescript-eslint/no-explicit-any': 'warn', // Warn instead of error
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      'no-console': 'off', // Allow console in tests
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'dist/',
      'node_modules/',
      '*.config.js',
      '*.config.ts',
      'coverage/',
    ],
  }
);
