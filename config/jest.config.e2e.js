module.exports = {
  testEnvironment: 'node',
  rootDir: '../',
  testMatch: [
    '<rootDir>/tests/e2e/**/*.e2e.test.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/tests/fixtures/',
    '<rootDir>/tests/unit/',
    '<rootDir>/tests/integration/'
  ],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.js'],
  testTimeout: 30000, // 30 second timeout for E2E tests
  collectCoverageFrom: [
    'src/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage-e2e',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ]
};