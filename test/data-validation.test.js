const AmazonInvoiceParser = require('../index');

describe('AmazonInvoiceParser - Data Validation', () => {
  let parser;

  beforeEach(() => {
    parser = new AmazonInvoiceParser();
  });

  describe('validateInvoiceData', () => {
    test('should validate a correct invoice with high score', () => {
      const invoice = {
        orderNumber: '123-4567890-1234567',
        orderDate: '15 December 2023',
        items: [
          { description: 'Item 1', price: '$10.00' },
          { description: 'Item 2', price: '$20.00' }
        ],
        subtotal: '$30.00',
        shipping: '$5.00',
        tax: '$3.00',
        total: '$38.00',
        vendor: 'Amazon'
      };

      const result = parser.validateInvoiceData(invoice);

      expect(result.score).toBeGreaterThan(90);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should detect mathematical inconsistencies', () => {
      const invoice = {
        orderNumber: '123-4567890-1234567',
        orderDate: '15 December 2023',
        items: [],
        subtotal: '$30.00',
        shipping: '$5.00',
        tax: '$3.00',
        total: '$50.00', // 30 + 5 + 3 = 38, not 50
        vendor: 'Amazon'
      };

      const result = parser.validateInvoiceData(invoice);

      expect(result.score).toBeLessThan(100);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'mathematical_inconsistency',
          severity: 'medium'
        })
      );
    });

    test('should detect missing critical fields', () => {
      const invoice = {
        orderDate: '15 December 2023',
        items: [],
        subtotal: '$30.00',
        shipping: '$5.00',
        tax: '$3.00',
        total: '$38.00',
        vendor: 'Amazon'
        // missing orderNumber
      };

      const result = parser.validateInvoiceData(invoice);

      expect(result.score).toBeLessThan(100);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'missing_critical_field',
          severity: 'high',
          message: expect.stringContaining('orderNumber')
        })
      );
    });

    test('should validate currency consistency', () => {
      const invoice = {
        orderNumber: '123-4567890-1234567',
        orderDate: '15 December 2023',
        items: [
          { description: 'Item 1', price: '$10.00' },
          { description: 'Item 2', price: '€20.00' } // Mixed currencies
        ],
        subtotal: '$30.00',
        shipping: '$5.00',
        tax: '$3.00',
        total: '$38.00',
        vendor: 'Amazon'
      };

      const result = parser.validateInvoiceData(invoice);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'multiple_currencies',
          severity: 'low'
        })
      );
    });

    test('should validate date consistency', () => {
      const invoice = {
        orderNumber: '123-4567890-1234567',
        orderDate: null, // Missing date
        items: [],
        subtotal: '$30.00',
        shipping: '$5.00',
        tax: '$3.00',
        total: '$38.00',
        vendor: 'Amazon'
      };

      const result = parser.validateInvoiceData(invoice);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'missing_date',
          severity: 'medium'
        })
      );
    });

    test('should detect empty items array', () => {
      const invoice = {
        orderNumber: '123-4567890-1234567',
        orderDate: '15 December 2023',
        items: [], // Empty items
        subtotal: '$30.00',
        shipping: '$5.00',
        tax: '$3.00',
        total: '$38.00',
        vendor: 'Amazon'
      };

      const result = parser.validateInvoiceData(invoice);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'no_items_found',
          severity: 'medium'
        })
      );
    });
  });

  describe('extractNumericValue', () => {
    test('should extract numeric values from currency strings', () => {
      const testCases = [
        { input: '$123.45', expected: 123.45 },
        { input: '€123,45', expected: 123.45 },
        { input: '£1,234.56', expected: 1234.56 },
        { input: '¥1234', expected: 1234 },
        { input: 'CHF 123.45', expected: 123.45 },
        { input: '€1.234,56', expected: 1234.56 }, // European format: should be parsed correctly
        { input: null, expected: 0 },
        { input: 'invalid', expected: 0 }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parser.extractNumericValue(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('extractCurrencySymbol', () => {
    test('should extract currency symbols from amount strings', () => {
      const testCases = [
        { input: '$123.45', expected: '$' },
        { input: '€123,45', expected: '€' },
        { input: '£1,234.56', expected: '£' },
        { input: '¥1234', expected: '¥' },
        { input: 'CHF 123.45', expected: 'CHF' },
        { input: 'Fr. 123.45', expected: 'Fr' },
        { input: 'no currency', expected: null }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parser.extractCurrencySymbol(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('isValidCurrencyFormat', () => {
    test('should validate currency format correctness', () => {
      const validFormats = [
        '$1,234.56',
        '€1.234,56',
        '£1,234.56',
        '¥1234',
        'CHF 1234.56',
        'Fr. 1234.56'
      ];

      const invalidFormats = [
        '123.45', // No currency symbol
        'invalid currency format',
        'CUR123.45' // Invalid currency code
      ];

      validFormats.forEach(format => {
        expect(parser.isValidCurrencyFormat(format)).toBe(true);
      });

      invalidFormats.forEach(format => {
        expect(parser.isValidCurrencyFormat(format)).toBe(false);
      });
    });
  });

  describe('generateValidationSummary', () => {
    test('should generate appropriate summary messages', () => {
      const testCases = [
        {
          validation: { errors: [], warnings: [] },
          expected: 'All validations passed'
        },
        {
          validation: { errors: [{}], warnings: [] },
          expected: '1 validation issue found: 1 error'
        },
        {
          validation: { errors: [], warnings: [{}] },
          expected: '1 validation issue found: 1 warning'
        },
        {
          validation: { errors: [{}, {}], warnings: [{}] },
          expected: '3 validation issues found: 2 errors, 1 warning'
        }
      ];

      testCases.forEach(({ validation, expected }) => {
        const result = parser.generateValidationSummary(validation);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Integration with extractInvoiceData', () => {
    test('should include validation results in extracted invoice data', () => {
      const mockText = `
Amazon.com Order Confirmation
Order #123-4567890-1234567
Order Placed: December 15, 2023

Items Ordered:
1 x Test Item $10.00

Subtotal: $10.00
Shipping: $0.00
Tax: $1.00
Grand Total: $11.00

Payment Method: Visa ****1234
      `.trim();

      const result = parser.extractInvoiceData(mockText);

      expect(result).toHaveProperty('validation');
      expect(result.validation).toHaveProperty('score');
      expect(result.validation).toHaveProperty('isValid');
      expect(result.validation).toHaveProperty('warnings');
      expect(result.validation).toHaveProperty('errors');
      expect(result.validation).toHaveProperty('summary');
    });

    test('should validate real extracted data', () => {
      // This test would benefit from actual PDF parsing, but we'll use mock data
      const mockInvoice = global.testUtils.createMockInvoice();
      const result = parser.validateInvoiceData(mockInvoice);

      expect(result.score).toBeGreaterThan(80);
      expect(result.isValid).toBe(true);
    });

    test('should handle error recovery metadata in validation', () => {
      const mockText = `
Amazon.com Order Confirmation
Order #123-4567890-1234567
Order Placed: December 15, 2023

Items Ordered:
1 x Test Item $10.00

Subtotal: $10.00
Shipping: $0.00
Tax: $1.00
Grand Total: $11.00
      `.trim();

      // Create partial data with error recovery metadata
      const partialData = parser.extractPartialInvoiceData(mockText, new Error('Test error'));
      const categorizedError = parser.categorizeError(new Error('Test'), 'test');
      const suggestions = parser.generateRecoverySuggestions(categorizedError, partialData);

      partialData.errorRecovery = {
        originalError: categorizedError,
        recoverySuggestions: suggestions,
        recoveryTimestamp: new Date().toISOString()
      };

      // Validate the data with error recovery metadata
      const result = parser.validateInvoiceData(partialData);

      expect(result).toHaveProperty('errorRecovery');
      expect(result.errorRecovery).toHaveProperty('originalError');
      expect(result.errorRecovery).toHaveProperty('recoverySuggestions');
      expect(result.errorRecovery).toHaveProperty('recoveryTimestamp');
      expect(result).toHaveProperty('extractionMetadata');
    });
  });
});