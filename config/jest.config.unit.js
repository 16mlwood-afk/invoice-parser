module.exports = {
  rootDir: '..',
  displayName: 'unit',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'index.js',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 55,
      lines: 40,
      statements: 40
    }
  },
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js',
    '<rootDir>/tests/unit/**/*.spec.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/tests/integration/',
    '<rootDir>/tests/e2e/'
  ],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.js']
};