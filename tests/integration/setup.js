// Integration test setup for Amazon Invoice Parser
const fs = require('fs');
const path = require('path');
const AmazonInvoiceParser = require('../../index');

// Set integration test environment
process.env.NODE_ENV = 'integration';

// Test data directory
const TEST_DATA_DIR = path.join(__dirname, '../../test_data');
const OUTPUT_DIR = path.join(__dirname, '../../test_output');

// Ensure test directories exist
if (!fs.existsSync(TEST_DATA_DIR)) {
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Global test utilities for integration tests
global.integrationUtils = {
  // Parser instance
  parser: new AmazonInvoiceParser(),

  // Test directories
  TEST_DATA_DIR,
  OUTPUT_DIR,

  // Helper to get test data files
  getTestDataFiles: () => {
    if (!fs.existsSync(TEST_DATA_DIR)) {
      return [];
    }

    return fs.readdirSync(TEST_DATA_DIR)
      .filter(file => file.endsWith('.pdf') || file.endsWith('.json'))
      .map(file => path.join(TEST_DATA_DIR, file));
  },

  // Helper to create temporary test file
  createTempFile: (content, filename = 'temp-test.pdf') => {
    const filePath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  },

  // Helper to clean up test files
  cleanupTestFiles: (pattern = '*') => {
    if (!fs.existsSync(OUTPUT_DIR)) return;

    const files = fs.readdirSync(OUTPUT_DIR);
    files.forEach(file => {
      if (file.includes(pattern) || pattern === '*') {
        try {
          fs.unlinkSync(path.join(OUTPUT_DIR, file));
        } catch (error) {
          console.warn(`Could not delete ${file}:`, error.message);
        }
      }
    });
  },

  // Helper to create mock PDF buffer (for testing without real PDFs)
  createMockPDFBuffer: (textContent) => {
    // Create a minimal PDF structure with the text content
    // This is a simplified PDF for testing purposes
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${textContent.length}
>>
stream
BT
/F1 12 Tf
72 720 Td
(${textContent}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000000461 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
520
%%EOF`;

    return Buffer.from(pdfContent);
  },

  // Helper to wait for file operations
  waitForFile: (filePath, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkFile = () => {
        if (fs.existsSync(filePath)) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`File ${filePath} not found within ${timeout}ms`));
        } else {
          setTimeout(checkFile, 100);
        }
      };

      checkFile();
    });
  },

  // Helper to measure execution time
  measureExecutionTime: async (fn) => {
    const startTime = Date.now();
    const result = await fn();
    const endTime = Date.now();
    return {
      result,
      executionTime: endTime - startTime
    };
  },

  // Helper to validate invoice structure
  validateInvoiceStructure: (invoice) => {
    const requiredFields = ['orderNumber', 'orderDate', 'items', 'vendor'];
    const hasRequiredFields = requiredFields.every(field =>
      invoice.hasOwnProperty(field) && invoice[field] !== null && invoice[field] !== undefined
    );

    return {
      hasRequiredFields,
      hasValidation: invoice.hasOwnProperty('validation'),
      hasMetadata: invoice.hasOwnProperty('pdfMetadata'),
      isValid: hasRequiredFields
    };
  }
};

// Configure console for integration tests (less verbose)
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.log = (...args) => {
  if (process.env.INTEGRATION_VERBOSE) {
    originalConsoleLog(...args);
  }
};

console.warn = (...args) => {
  if (process.env.INTEGRATION_VERBOSE) {
    originalConsoleWarn(...args);
  }
};

console.error = (...args) => {
  if (process.env.INTEGRATION_VERBOSE) {
    originalConsoleError(...args);
  }
};

// Cleanup after all tests
afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;

  // Clean up test files (optional - comment out if you want to inspect outputs)
  // integrationUtils.cleanupTestFiles('integration-test-*');
});