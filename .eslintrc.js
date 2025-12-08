module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Code style
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
    'max-len': ['error', { code: 100 }],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',

    // Best practices
    'no-console': 'off', // Allow console for CLI tool
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',

    // Error prevention
    'no-undef': 'error',
    'no-unreachable': 'error',
    'valid-typeof': 'error',

    // Node.js specific
    'no-process-exit': 'off', // Allow process.exit for CLI
    'handle-callback-err': 'error'
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '*.min.js',
    'coverage/',
    '.ai/'
  ]
};