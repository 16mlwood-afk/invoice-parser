module.exports = {
  rootDir: '..',
  displayName: 'integration',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/test/integration/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup.js'],
  testTimeout: 30000, // Longer timeout for integration tests
  verbose: true
};