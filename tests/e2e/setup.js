// E2E Test Setup
// This file runs before each E2E test suite

// Set test environment variables
process.env.NODE_ENV = 'test';

// Increase timeout for PDF processing
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  // Store original console methods
  global.originalConsole = {
    log: originalConsoleLog,
    warn: originalConsoleWarn,
    error: originalConsoleError
  };
});

afterAll(() => {
  // Restore original console methods
  console.log = global.originalConsole.log;
  console.warn = global.originalConsole.warn;
  console.error = global.originalConsole.error;
});

// Global test utilities
global.testUtils = {
  // Helper to create mock PDF buffer for testing
  createMockPdfBuffer: (content) => {
    // This would create a minimal PDF buffer for testing
    // For now, we'll rely on the parser's mock data fallback
    return Buffer.from(content || 'mock pdf content');
  },

  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};