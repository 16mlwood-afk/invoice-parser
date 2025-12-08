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
    '<rootDir>/test/**/*.test.js',
    '<rootDir>/test/**/*.spec.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/test/integration/'
  ],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/test/setup.js']
};