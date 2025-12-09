module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/tests/fixtures/'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/unit/setup.js',
    '<rootDir>/tests/integration/setup.js'
  ],
  collectCoverageFrom: [
    'index.js',
    'src/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 55,
      lines: 40,
      statements: 40
    }
  },
  verbose: true
};