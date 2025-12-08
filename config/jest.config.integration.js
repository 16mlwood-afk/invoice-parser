module.exports = {
  rootDir: '..',
  displayName: 'integration',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],
  testTimeout: 30000, // Longer timeout for integration tests
  verbose: true
};