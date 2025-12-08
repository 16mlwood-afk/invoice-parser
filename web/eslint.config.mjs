import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',

        // Browser/DOM globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        File: 'readonly',
        FileList: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLDivElement: 'readonly',
        Event: 'readonly',
        DragEvent: 'readonly',
        DataTransfer: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',

        // Test globals
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        waitFor: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Code style - matching root project
      'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'max-len': ['error', { code: 100 }],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',

      // Best practices
      'no-console': 'off', // Allow console for development
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',

      // Error prevention
      'no-undef': 'error',
      'no-unreachable': 'error',
      'valid-typeof': 'error',

      // TypeScript specific
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '*.min.js',
      'coverage/',
      '.ai/',
      '.next/',
      'out/',
      'next-env.d.ts',
    ],
  },
];