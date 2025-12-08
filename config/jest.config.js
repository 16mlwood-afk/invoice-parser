module.exports = {
  rootDir: '..',
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
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/tests/fixtures/'
  ],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.js']
};