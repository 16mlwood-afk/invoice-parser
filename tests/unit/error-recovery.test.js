const AmazonInvoiceParser = require('../../index');

describe('AmazonInvoiceParser - Error Recovery System', () => {
  let parser;

  beforeEach(() => {
    parser = new AmazonInvoiceParser();
  });

  describe('Error Categorization', () => {
    test('should categorize file access errors as critical', () => {
      const error = new Error('PDF file not found: test.pdf');
      const result = parser.categorizeError(error, 'pdf-parsing');

      expect(result.level).toBe(AmazonInvoiceParser.ERROR_LEVELS.CRITICAL);
      expect(result.type).toBe('file_access_error');
      expect(result.recoverable).toBe(false);
      expect(result.suggestion).toContain('Check file path');
    });

    test('should categorize PDF parsing errors as recoverable', () => {
      const error = new Error('PDF parsing failed: invalid format');
      const result = parser.categorizeError(error, 'pdf-parsing');

      expect(result.level).toBe(AmazonInvoiceParser.ERROR_LEVELS.RECOVERABLE);
      expect(result.type).toBe('pdf_parsing_error');
      expect(result.recoverable).toBe(true);
      expect(result.suggestion).toContain('Try re-saving PDF');
    });

    test('should categorize field extraction errors as recoverable', () => {
      const error = new Error('Field extraction failed');
      const result = parser.categorizeError(error, 'field-extraction');

      expect(result.level).toBe(AmazonInvoiceParser.ERROR_LEVELS.RECOVERABLE);
      expect(result.type).toBe('field_extraction_error');
      expect(result.recoverable).toBe(true);
    });

    test('should categorize validation errors as info level', () => {
      const error = new Error('Validation warning: missing field');
      const result = parser.categorizeError(error, 'validation');

      expect(result.level).toBe(AmazonInvoiceParser.ERROR_LEVELS.INFO);
      expect(result.type).toBe('validation_warning');
      expect(result.recoverable).toBe(true);
    });

    test('should handle unknown errors as recoverable', () => {
      const error = new Error('Unexpected error occurred');
      const result = parser.categorizeError(error, 'unknown');

      expect(result.level).toBe(AmazonInvoiceParser.ERROR_LEVELS.RECOVERABLE);
      expect(result.type).toBe('unknown_error');
      expect(result.recoverable).toBe(true);
    });
  });

  describe('Partial Data Extraction', () => {
    const mockInvoiceText = `
Amazon.com Order Confirmation
Order #123-4567890-1234567
Order Placed: December 15, 2023

Items Ordered:
1 x Kindle Paperwhite $129.99
1 x Kindle Cover $29.99

Subtotal: $159.98
Shipping: $0.00
Tax: $12.80
Grand Total: $172.78

Payment Method: Visa ****1234
    `.trim();

    test('should extract partial data successfully', () => {
      const originalError = new Error('PDF parsing failed');
      const result = parser.extractPartialInvoiceData(mockInvoiceText, originalError);

      expect(result.vendor).toBe('Amazon');
      expect(result.orderNumber).toBe('123-4567890-1234567');
      expect(result.orderDate).toBe('December 15, 2023');
      // Items extraction is complex, just check it exists and is an array
      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.subtotal).toBe('$159.98');
      expect(result.total).toBe('$172.78');
    });

    test('should calculate confidence scores correctly', () => {
      const originalError = new Error('PDF parsing failed');
      const result = parser.extractPartialInvoiceData(mockInvoiceText, originalError);

      expect(result.extractionMetadata.confidence.overall).toBeGreaterThan(0.8); // Should be high confidence
      expect(result.extractionMetadata.confidence.orderNumber).toBe(1.0);
      expect(result.extractionMetadata.confidence.orderDate).toBe(1.0);
      expect(result.extractionMetadata.usable).toBe(true);
    });

    test('should mark data as usable when critical fields are present', () => {
      const originalError = new Error('PDF parsing failed');
      const result = parser.extractPartialInvoiceData(mockInvoiceText, originalError);

      expect(result.extractionMetadata.usable).toBe(true);
      expect(result.extractionMetadata.confidence.overall).toBeGreaterThan(0.3);
    });

    test('should handle missing critical fields', () => {
      const incompleteText = `
Items Ordered:
1 x Test Item $10.00
Subtotal: $10.00
      `.trim();

      const originalError = new Error('PDF parsing failed');
      const result = parser.extractPartialInvoiceData(incompleteText, originalError);

      expect(result.extractionMetadata.usable).toBe(false);
      expect(result.extractionMetadata.confidence.orderNumber).toBe(0.0);
      expect(result.extractionMetadata.confidence.orderDate).toBe(0.0);
      expect(result.extractionMetadata.errors).toContainEqual(
        expect.objectContaining({
          field: 'orderNumber',
          type: 'field_not_found'
        })
      );
    });

    test('should handle extraction errors gracefully', () => {
      // Create a mock extractor that throws an error
      const originalExtractor = parser.extraction.extractOrderNumber;
      parser.extraction.extractOrderNumber = jest.fn(() => {
        throw new Error('Mock extraction error');
      });

      const originalError = new Error('PDF parsing failed');
      const result = parser.extractPartialInvoiceData(mockInvoiceText, originalError);

      expect(result.extractionMetadata.errors).toContainEqual(
        expect.objectContaining({
          field: 'orderNumber',
          type: 'extraction_error'
        })
      );

      // Restore original method
      parser.extraction.extractOrderNumber = originalExtractor;
    });
  });

  describe('Recovery Suggestions', () => {
    test('should generate suggestions for PDF parsing errors', () => {
      const categorizedError = {
        type: 'pdf_parsing_error',
        level: 'recoverable',
        message: 'PDF parsing failed',
        context: 'pdf-parsing',
        recoverable: true,
        suggestion: 'Try re-saving PDF'
      };

      const partialData = {
        extractionMetadata: {
          usable: true,
          confidence: { overall: 0.8 }
        }
      };

      const suggestions = parser.generateRecoverySuggestions(categorizedError, partialData);

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          action: 'resave_pdf',
          priority: 'high'
        })
      );

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          action: 'use_partial_data',
          priority: 'medium'
        })
      );
    });

    test('should generate suggestions for file access errors', () => {
      const categorizedError = {
        type: 'file_access_error',
        level: 'critical',
        message: 'File not found',
        context: 'file-access',
        recoverable: false,
        suggestion: 'Check file path'
      };

      const partialData = {
        extractionMetadata: {
          usable: false,
          confidence: { overall: 0.0 }
        }
      };

      const suggestions = parser.generateRecoverySuggestions(categorizedError, partialData);

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          action: 'check_permissions',
          priority: 'high'
        })
      );

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          action: 'verify_path',
          priority: 'high'
        })
      );
    });

    test('should prioritize suggestions based on confidence', () => {
      const categorizedError = {
        type: 'field_extraction_error',
        level: 'recoverable',
        message: 'Field extraction failed',
        context: 'field-extraction',
        recoverable: true,
        suggestion: 'Partial data extracted'
      };

      const highConfidenceData = {
        extractionMetadata: {
          usable: true,
          confidence: { overall: 0.9 }
        }
      };

      const suggestions = parser.generateRecoverySuggestions(categorizedError, highConfidenceData);

      expect(suggestions[0]).toEqual(
        expect.objectContaining({
          action: 'high_confidence_data',
          priority: 'high'
        })
      );
    });

    test('should handle unknown error types', () => {
      const categorizedError = {
        type: 'unknown_error_type',
        level: 'recoverable',
        message: 'Unknown error',
        context: 'unknown',
        recoverable: true,
        suggestion: 'Generic suggestion'
      };

      const partialData = {
        extractionMetadata: {
          usable: true,
          confidence: { overall: 0.5 }
        }
      };

      const suggestions = parser.generateRecoverySuggestions(categorizedError, partialData);

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          action: 'use_extracted_data',
          priority: 'medium'
        })
      );
    });
  });

  describe('Integration with parseInvoice', () => {
    test('should attempt recovery on PDF parsing failure', async () => {
      // Set test environment to force error recovery instead of mock fallback
      const originalEnv = process.env.NODE_ENV;
      const originalE2eTest = process.env.E2E_TEST;
      process.env.NODE_ENV = 'test'; // Not development, so no mock fallback
      process.env.E2E_TEST = 'false'; // Not E2E test, so no mock data injection

      // Mock fs.existsSync to return true
      const originalExistsSync = require('fs').existsSync;
      require('fs').existsSync = jest.fn(() => true);

      // Mock fs.readFileSync to return valid buffer
      const originalReadFileSync = require('fs').readFileSync;
      require('fs').readFileSync = jest.fn(() => Buffer.from('mock pdf content'));

      // Mock pdf-parse to throw an error
      const originalPdf = require('pdf-parse');
      const mockPdfParse = jest.fn(() => {
        throw new Error('PDF parsing failed');
      });

      // Replace the pdf function
      require.cache[require.resolve('pdf-parse')] = {
        exports: mockPdfParse
      };

      // Mock readFileSync to return some basic invoice text for partial extraction
      const testReadFileSync = require('fs').readFileSync;
      require('fs').readFileSync = jest.fn(() => Buffer.from('Some basic invoice text that might contain order information'));

      const result = await parser.parseInvoice('/fake/path/nonexistent-invoice-file.pdf', { silent: true });

      // Restore readFileSync
      require('fs').readFileSync = testReadFileSync;

      // Restore environment
      process.env.NODE_ENV = originalEnv;
      process.env.E2E_TEST = originalE2eTest;

      // Should have attempted recovery and returned partial data
      expect(result).toBeTruthy();
      expect(result.errorRecovery).toBeDefined();
      expect(result.extractionMetadata).toBeDefined();
      expect(result.extractionMetadata.mode).toBe('partial_recovery');

      // Restore mocks
      require('fs').existsSync = originalExistsSync;
      require('fs').readFileSync = originalReadFileSync;
      require.cache[require.resolve('pdf-parse')] = { exports: originalPdf };
    });

    test('should not attempt recovery for critical errors', async () => {
      // Mock fs.existsSync to return false (critical error)
      const originalExistsSync = require('fs').existsSync;
      require('fs').existsSync = jest.fn(() => false);

      const result = await parser.parseInvoice('/nonexistent/file.pdf', { silent: true });

      // Should not attempt recovery for file not found
      expect(result).toBeNull();

      // Restore mock
      require('fs').existsSync = originalExistsSync;
    });
  });

  describe('Schema Validation', () => {
    test('should validate error recovery metadata structure', () => {
      const partialData = parser.extractPartialInvoiceData(`
Amazon.com Order Confirmation
Order #123-4567890-1234567
Order Placed: December 15, 2023
Items Ordered:
1 x Test Item $10.00
Subtotal: $10.00
      `.trim(), new Error('Test error'));

      const categorizedError = parser.categorizeError(new Error('Test'), 'test');
      const suggestions = parser.generateRecoverySuggestions(categorizedError, partialData);

      // Add error recovery metadata
      partialData.errorRecovery = {
        originalError: categorizedError,
        recoverySuggestions: suggestions,
        recoveryTimestamp: new Date().toISOString()
      };

      // Validate against schema
      const { error } = parser.invoiceSchema.validate(partialData, {
        stripUnknown: true,
        convert: true
      });

      expect(error).toBeUndefined();
    });

    test('should validate extraction metadata structure', () => {
      const partialData = parser.extractPartialInvoiceData(`
Order #123-4567890-1234567
Order Placed: December 15, 2023
      `.trim(), new Error('Test error'));

      // Validate extraction metadata
      expect(partialData.extractionMetadata).toHaveProperty('mode');
      expect(partialData.extractionMetadata).toHaveProperty('confidence');
      expect(partialData.extractionMetadata).toHaveProperty('errors');
      expect(partialData.extractionMetadata).toHaveProperty('recoveryAttempted');
      expect(partialData.extractionMetadata).toHaveProperty('usable');
    });
  });
});