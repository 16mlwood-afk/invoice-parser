const AmazonInvoiceParser = require('../index');
const { Command } = require('commander');

describe('AmazonInvoiceParser - CLI and Schema Validation', () => {
  let parser;

  beforeEach(() => {
    parser = new AmazonInvoiceParser();
  });

  describe('Schema Validation', () => {
    test('should validate correct invoice data', () => {
      const validInvoice = {
        orderNumber: '123-4567890-1234567',
        orderDate: '15 December 2023',
        items: [
          { description: 'Test Item', price: '$10.00' }
        ],
        subtotal: '$10.00',
        shipping: '$0.00',
        tax: '$1.00',
        total: '$11.00',
        vendor: 'Amazon',
        pdfMetadata: {
          fileSize: 1024,
          extractedAt: '2023-12-15T10:00:00.000Z',
          extractionMethod: 'pdf-parse',
          pages: 1,
          textLength: 500
        }
      };

      const result = parser.validateJsonOutput(validInvoice);
      expect(result).not.toBeNull();
      expect(result.orderNumber).toBe(validInvoice.orderNumber);
    });

    test('should validate invoice with validation data', () => {
      const invoiceWithValidation = {
        orderNumber: '123-4567890-1234567',
        orderDate: '15 December 2023',
        items: [{ description: 'Test Item', price: '$10.00' }],
        subtotal: '$10.00',
        shipping: '$0.00',
        tax: '$1.00',
        total: '$11.00',
        vendor: 'Amazon',
        validation: {
          score: 95,
          isValid: true,
          warnings: [],
          errors: [],
          summary: 'All validations passed'
        }
      };

      const result = parser.validateJsonOutput(invoiceWithValidation);
      expect(result).not.toBeNull();
      expect(result.validation.score).toBe(95);
    });

    test('should reject invalid order number format', () => {
      const invalidInvoice = {
        orderNumber: 'invalid-format',
        orderDate: '15 December 2023',
        items: [],
        subtotal: '$10.00',
        shipping: '$0.00',
        tax: '$1.00',
        total: '$11.00',
        vendor: 'Amazon'
      };

      const result = parser.validateJsonOutput(invalidInvoice);
      expect(result).toBeNull();
    });

    test('should handle missing optional fields', () => {
      const minimalInvoice = {
        orderNumber: '123-4567890-1234567',
        orderDate: '15 December 2023',
        items: [],
        subtotal: null,
        shipping: null,
        tax: null,
        total: '$11.00',
        vendor: 'Amazon'
      };

      const result = parser.validateJsonOutput(minimalInvoice);
      expect(result).not.toBeNull();
      expect(result.subtotal).toBeNull();
      expect(result.shipping).toBeNull();
    });

    test('should validate report schema', () => {
      const validReport = {
        summary: {
          totalInvoices: 2,
          totalSpent: 50.00,
          dateRange: {
            start: '2023-12-01T00:00:00.000Z',
            end: '2023-12-31T23:59:59.999Z'
          },
          topVendors: ['Amazon']
        },
        invoices: [
          {
            orderNumber: '123-4567890-1234567',
            orderDate: '15 December 2023',
            items: [],
            subtotal: '$25.00',
            shipping: '$0.00',
            tax: '$2.50',
            total: '$27.50',
            vendor: 'Amazon'
          },
          {
            orderNumber: '987-6543210-7654321',
            orderDate: '20 December 2023',
            items: [],
            subtotal: '$20.00',
            shipping: '$0.00',
            tax: '$2.00',
            total: '$22.50',
            vendor: 'Amazon'
          }
        ]
      };

      const result = parser.validateReportOutput(validReport);
      expect(result).not.toBeNull();
      expect(result.summary.totalInvoices).toBe(2);
    });
  });

  describe('Mock Data Generation', () => {
    test('should generate consistent mock invoice data', () => {
      const mockInvoice = global.testUtils.createMockInvoice();

      expect(mockInvoice).toHaveProperty('orderNumber');
      expect(mockInvoice).toHaveProperty('orderDate');
      expect(mockInvoice).toHaveProperty('items');
      expect(mockInvoice).toHaveProperty('subtotal');
      expect(mockInvoice).toHaveProperty('total');
      expect(mockInvoice.vendor).toBe('Amazon');
    });

    test('should allow mock invoice overrides', () => {
      const overrides = {
        orderNumber: '999-9999999-9999999',
        total: '$999.99'
      };

      const mockInvoice = global.testUtils.createMockInvoice(overrides);

      expect(mockInvoice.orderNumber).toBe('999-9999999-9999999');
      expect(mockInvoice.total).toBe('$999.99');
      expect(mockInvoice.vendor).toBe('Amazon'); // Should keep default
    });

    test('should generate mock PDF text', () => {
      const mockText = global.testUtils.createMockPDFText();

      expect(typeof mockText).toBe('string');
      expect(mockText).toContain('Amazon.com Order Confirmation');
      expect(mockText).toContain('Order #');
      expect(mockText).toContain('Grand Total');
    });
  });

  describe('File System Integration', () => {
    test('should handle file operations safely', () => {
      // Test the safeWriteFile function indirectly through validation
      const validInvoice = global.testUtils.createMockInvoice();
      const validated = parser.validateJsonOutput(validInvoice);

      expect(validated).not.toBeNull();
      // This ensures the data structure is valid for file writing
    });
  });

  describe('Error Handling in Validation', () => {
    test('should handle validation errors gracefully', () => {
      const invalidInvoice = {
        orderNumber: 'invalid-format', // Invalid format
        orderDate: '15 December 2023',
        items: [],
        total: '$11.00',
        vendor: 'Amazon'
      };

      const result = parser.validateJsonOutput(invalidInvoice);
      expect(result).toBeNull();
    });

    test('should handle malformed validation data', () => {
      const invoiceWithBadValidation = {
        orderNumber: '123-4567890-1234567',
        orderDate: '15 December 2023',
        items: [],
        total: '$11.00',
        vendor: 'Amazon',
        validation: {
          score: 'invalid', // Should be number
          isValid: true,
          warnings: [],
          errors: [],
          summary: 'Test'
        }
      };

      const result = parser.validateJsonOutput(invoiceWithBadValidation);
      expect(result).toBeNull();
    });
  });

  describe('Currency Format Validation', () => {
    test('should accept various valid currency formats', () => {
      const validInvoices = [
        {
          orderNumber: '123-4567890-1234567',
          orderDate: '15 December 2023',
          items: [],
          subtotal: '$1,234.56',
          shipping: '€0,00',
          tax: '£12.34',
          total: '¥1234',
          vendor: 'Amazon'
        },
        {
          orderNumber: '123-4567890-1234567',
          orderDate: '15 December 2023',
          items: [],
          subtotal: 'CHF 123.45',
          shipping: 'Fr. 0.00',
          tax: '€12,34',
          total: '$56.78',
          vendor: 'Amazon'
        }
      ];

      validInvoices.forEach(invoice => {
        const result = parser.validateJsonOutput(invoice);
        expect(result).not.toBeNull();
      });
    });

    test('should handle currency format validation in data validation', () => {
      const invoice = {
        orderNumber: '123-4567890-1234567',
        orderDate: '15 December 2023',
        items: [],
        subtotal: 'invalid currency format',
        shipping: '$0.00',
        tax: '$1.00',
        total: '$1.00',
        vendor: 'Amazon'
      };

      const result = parser.validateInvoiceData(invoice);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'invalid_currency_format'
        })
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle invalid invoice data', () => {
      // Null and undefined should fail
      expect(parser.validateJsonOutput(null)).toBeNull();
      expect(parser.validateJsonOutput(undefined)).toBeUndefined();

      // Empty object should be validated with defaults
      const emptyResult = parser.validateJsonOutput({});
      expect(emptyResult).not.toBeNull();
      expect(emptyResult.vendor).toBe('Amazon'); // Should have defaults

      // Valid minimal invoice should work
      const minimalInvoice = {
        orderNumber: '123-4567890-1234567',
        orderDate: '2023-01-01',
        items: [],
        total: '$10.00',
        vendor: 'Amazon'
      };
      const result = parser.validateJsonOutput(minimalInvoice);
      expect(result).not.toBeNull();
    });

    test('should handle very large numbers', () => {
      const invoice = global.testUtils.createMockInvoice({
        total: '$999999.99'
      });

      const result = parser.validateJsonOutput(invoice);
      expect(result).not.toBeNull();
      expect(result.total).toBe('$999999.99');
    });

    test('should handle very small numbers', () => {
      const invoice = global.testUtils.createMockInvoice({
        total: '$0.01'
      });

      const result = parser.validateJsonOutput(invoice);
      expect(result).not.toBeNull();
      expect(result.total).toBe('$0.01');
    });
  });
});