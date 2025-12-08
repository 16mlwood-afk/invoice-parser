const AmazonInvoiceParser = require('../index');

// Comprehensive edge case tests for parsing functions
describe('AmazonInvoiceParser - Edge Cases and Boundary Conditions', () => {
  let parser;

  beforeEach(() => {
    parser = new AmazonInvoiceParser();
  });

  describe('extractOrderNumber - Edge Cases', () => {
    test('should handle malformed order numbers', () => {
      const testCases = [
        { text: 'Order #123-456789-1234567', expected: null }, // Too short segments
        { text: 'Order #123-45678901-1234567', expected: null }, // Too long segment
        { text: 'Order #ABC-1234567-8901234', expected: null }, // Invalid first segment
        { text: 'Order #123-ABCDEF7-1234567', expected: null }, // Invalid middle segment
        { text: 'Order #123-4567890-ABCDEFG', expected: null }, // Invalid last segment
        { text: 'Order #123-4567890-12345678', expected: null }, // Too long last segment
        { text: 'Order #12345678901234567', expected: null }, // No dashes
        { text: 'Order #123--4567890-1234567', expected: null }, // Double dash
        { text: 'Order #123-4567890-', expected: null }, // Missing last segment
        { text: 'Order #-4567890-1234567', expected: null }, // Missing first segment
      ];

      testCases.forEach(({ text, expected }) => {
        const result = parser.extractOrderNumber(text);
        if (result !== expected) {
          console.log(`Test case failing: "${text}" -> expected: ${expected}, got: ${result}`);
        }
        expect(result).toBe(expected);
      });
    });

    test('should handle special characters and unicode', () => {
      const testCases = [
        { text: 'Order #123-4567890-1234567 ✅', expected: '123-4567890-1234567' },
        { text: 'Bestellnr. 304-1234567-8901234 é', expected: '304-1234567-8901234' },
        { text: 'Numéro de commande: 405-6789012-3456789 ñ', expected: '405-6789012-3456789' },
      ];

      testCases.forEach(({ text, expected }) => {
        const result = parser.extractOrderNumber(text);
        expect(result).toBe(expected);
      });
    });

    test('should handle very long text', () => {
      const longText = 'Some text '.repeat(1000) + 'Order #123-4567890-1234567' + ' more text'.repeat(1000);
      const result = parser.extractOrderNumber(longText);
      expect(result).toBe('123-4567890-1234567');
    });

    test('should handle null and undefined input', () => {
      expect(parser.extractOrderNumber(null)).toBeNull();
      expect(parser.extractOrderNumber(undefined)).toBeNull();
      expect(parser.extractOrderNumber('')).toBeNull();
    });
  });

  describe('extractOrderDate - Edge Cases', () => {
    test('should handle malformed dates', () => {
      const testCases = [
        { text: 'Order Placed: 32 December 2023', expected: null }, // Invalid day
        { text: 'Order Placed: December 2023', expected: null }, // Missing day
        { text: 'Order Placed: 15 2023', expected: null }, // Missing month
        { text: 'Order Placed: 15 December', expected: null }, // Missing year
        { text: 'Bestelldatum: 32. Dezember 2023', expected: null }, // Invalid German day
        { text: 'Date de commande: 32 décembre 2023', expected: null }, // Invalid French day
        { text: 'Order Placed: 15/13/2023', expected: null }, // Invalid month
        { text: 'Order Placed: 29 February 2023', expected: null }, // Invalid leap year date
      ];

      testCases.forEach(({ text, expected }) => {
        const result = parser.extractOrderDate(text);
        expect(result).toBe(expected);
      });
    });

    test('should handle various date formats and edge cases', () => {
      const testCases = [
        { text: 'Order Placed: 01 January 2023', expected: '01 January 2023' }, // Leading zero
        { text: 'Bestelldatum: 1. Januar 2023', expected: '1 Januar 2023' }, // Single digit day
        { text: 'Date de commande: 1er janvier 2023', expected: '1er janvier 2023' }, // French ordinal
        { text: 'Order Placed: 31 December 2023', expected: '31 December 2023' }, // Last day of month
        { text: 'Order Placed: 29 February 2024', expected: '29 February 2024' }, // Leap year
      ];

      testCases.forEach(({ text, expected }) => {
        const result = parser.extractOrderDate(text);
        expect(result).toBe(expected);
      });
    });

    test('should handle date with special characters', () => {
      const testCases = [
        { text: 'Order Placed: 15 Décembre 2023', expected: '15 Décembre 2023' }, // Accented characters
        { text: 'Bestelldatum: 15. Dezember 2023!', expected: '15 Dezember 2023' }, // Exclamation mark
        { text: 'Date de commande: 15 décembre 2023...', expected: '15 décembre 2023' }, // Ellipsis
      ];

      testCases.forEach(({ text, expected }) => {
        const result = parser.extractOrderDate(text);
        expect(result).toBe(expected);
      });
    });

    test('should handle null and undefined input', () => {
      expect(parser.extractOrderDate(null)).toBeNull();
      expect(parser.extractOrderDate(undefined)).toBeNull();
      expect(parser.extractOrderDate('')).toBeNull();
    });
  });

  describe('extractItems - Edge Cases', () => {
    test('should handle malformed item descriptions', () => {
      const testCases = [
        { text: 'Items Ordered:\n1 x $49.99', expected: [{ description: '1 x $49.99', price: '$49.99' }] }, // Missing description
        { text: 'Items Ordered:\nTest Item\n$49.99', expected: [{ description: 'Test Item\n$49.99', price: '$49.99' }] }, // Multiline
        { text: 'Items Ordered:\n1 x Test Item $', expected: [{ description: '1 x Test Item $', price: '$' }] }, // Incomplete price
        { text: 'Artikel:\n1 x Test €49,99\n1 x Another €', expected: [
          { description: '1 x Test', price: '€49,99' },
          { description: '1 x Another €', price: '€' }
        ]}, // Incomplete German price
      ];

      testCases.forEach(({ text, expected }) => {
        const result = parser.extractItems(text);
        expect(result).toEqual(expected);
      });
    });

    test('should handle very long item descriptions', () => {
      const longDescription = 'A'.repeat(1000);
      const text = `Items Ordered:\n1 x ${longDescription} $49.99`;
      const result = parser.extractItems(text);
      expect(result).toHaveLength(1);
      expect(result[0].description).toContain(longDescription);
    });

    test('should handle items with special characters and unicode', () => {
      const text = `Items Ordered:
1 x Test Item with émojis 😀 and symbols @#$% $49.99
1 x ñoño item €29.99
1 x 商品名称 ¥99.99`;

      const result = parser.extractItems(text);
      expect(result).toHaveLength(3);
      expect(result[0].price).toBe('$49.99');
      expect(result[1].price).toBe('€29.99');
      expect(result[2].price).toBe('¥99.99');
    });

    test('should handle empty and null input', () => {
      expect(parser.extractItems(null)).toEqual([]);
      expect(parser.extractItems(undefined)).toEqual([]);
      expect(parser.extractItems('')).toEqual([]);
      expect(parser.extractItems('No items here')).toEqual([]);
    });
  });

  describe('Currency Extraction Functions - Edge Cases', () => {
    describe('extractSubtotal - Edge Cases', () => {
      test('should handle malformed subtotal amounts', () => {
        const testCases = [
          { text: 'Subtotal: $', expected: null }, // Missing amount
          { text: 'Subtotal: $abc', expected: null }, // Non-numeric
          { text: 'Subtotal: $49.999', expected: '$49.999' }, // Unusual decimals
          { text: 'Zwischensumme: €49,999', expected: '€49,999' }, // German unusual decimals
          { text: 'Sous-total: 49,999 €', expected: '49,999 €' }, // French unusual decimals
        ];

        testCases.forEach(({ text, expected }) => {
          const result = parser.extractSubtotal(text);
          expect(result).toBe(expected);
        });
      });

      test('should handle various currency symbols and positions', () => {
        const testCases = [
          { text: 'Subtotal: $49.99', expected: '$49.99' },
          { text: 'Subtotal: 49.99$', expected: '49.99$' },
          { text: 'Subtotal: USD 49.99', expected: 'USD 49.99' },
          { text: 'Zwischensumme: 49,99 €', expected: '49,99 €' },
          { text: 'Sous-total: 49,99€', expected: '49,99€' },
          { text: 'Subtotal: £49.99', expected: '£49.99' },
          { text: 'Subtotal: 49.99 CHF', expected: '49.99 CHF' },
        ];

        testCases.forEach(({ text, expected }) => {
          const result = parser.extractSubtotal(text);
          expect(result).toBe(expected);
        });
      });
    });

    describe('extractTotal - Edge Cases', () => {
      test('should handle various total formats and edge cases', () => {
        const testCases = [
          { text: 'Grand Total: $0.00', expected: '$0.00' }, // Zero amount
          { text: 'Total: $999999.99', expected: '$999999.99' }, // Large amount
          { text: 'Gesamtbetrag: €0,01', expected: '€0,01' }, // Small German amount
          { text: 'Total TTC: 1000000,00 €', expected: '1000000,00 €' }, // Large French amount
          { text: 'Total: $1,234.56', expected: '$1,234.56' }, // Comma thousands separator
        ];

        testCases.forEach(({ text, expected }) => {
          const result = parser.extractTotal(text);
          if (result !== expected) {
            console.log(`Test case failing: "${text}" -> expected: ${expected}, got: ${result}`);
          }
          expect(result).toBe(expected);
        });
      });

      test('should handle malformed total amounts', () => {
        const testCases = [
          { text: 'Total: $', expected: null },
          { text: 'Total: $abc.def', expected: null },
          { text: 'Grand Total: $$49.99', expected: null }, // Double currency
          { text: 'Total: 49.99 49.99 $', expected: null }, // Duplicate amounts
        ];

        testCases.forEach(({ text, expected }) => {
          const result = parser.extractTotal(text);
          if (result !== expected) {
            console.log(`Test case failing: "${text}" -> expected: ${expected}, got: ${result}`);
          }
          expect(result).toBe(expected);
        });
      });
    });
  });

  describe('Validation Functions - Edge Cases', () => {
    describe('validateInvoiceData - Edge Cases', () => {
      test('should handle null and undefined invoices', () => {
        const nullResult = parser.validateInvoiceData(null);
        expect(nullResult.isValid).toBe(false);
        expect(nullResult.score).toBe(0);
        expect(nullResult.errors).toHaveLength(1);

        const undefinedResult = parser.validateInvoiceData(undefined);
        expect(undefinedResult.isValid).toBe(false);
        expect(undefinedResult.score).toBe(0);
        expect(undefinedResult.errors).toHaveLength(1);
      });

      test('should handle invoices with missing required fields', () => {
        const incompleteInvoice = {
          orderNumber: '123-4567890-1234567',
          // Missing other fields
        };

        const result = parser.validateInvoiceData(incompleteInvoice);
        expect(result.score).toBeLessThan(100);
        expect(result.isValid).toBe(false);
      });

      test('should handle invoices with invalid data types', () => {
        const invalidInvoice = {
          orderNumber: 123456789, // Should be string
          orderDate: new Date(), // Should be string
          items: 'not an array', // Should be array
          subtotal: 49.99, // Should be string
          total: null,
          vendor: 'Amazon'
        };

        const result = parser.validateInvoiceData(invalidInvoice);
        // The function should handle the invalid items array gracefully now
        expect(result).toBeDefined();
        expect(typeof result.score).toBe('number');
      });
    });

    describe('extractNumericValue - Edge Cases', () => {
      test('should handle various malformed currency strings', () => {
        const testCases = [
          { input: '$49.99', expected: 49.99 },
          { input: '€49,99', expected: 49.99 },
          { input: '49.99€', expected: 49.99 },
          { input: '$1,234.56', expected: 1234.56 },
          { input: '€1.234,56', expected: 1234.56 },
          { input: '£1,234.56', expected: 1234.56 },
          { input: '$0.00', expected: 0 },
          { input: '$', expected: 0 }, // No number
          { input: '$abc', expected: 0 }, // Non-numeric
          { input: '$49.99.99', expected: 49.99 }, // Multiple decimals
          { input: '49.99', expected: 49.99 }, // No currency symbol
          { input: '1,234', expected: 1234 }, // No decimal
          { input: '€1,234,567.89', expected: 1234567.89 }, // Multiple commas
        ];

        testCases.forEach(({ input, expected }) => {
          const result = parser.extractNumericValue(input);
          if (result !== expected) {
            console.log(`Test case failing: "${input}" -> expected: ${expected}, got: ${result}`);
          }
          expect(result).toBe(expected);
        });
      });

      test('should handle null and undefined input', () => {
        expect(parser.extractNumericValue(null)).toBe(0);
        expect(parser.extractNumericValue(undefined)).toBe(0);
        expect(parser.extractNumericValue('')).toBe(0);
      });
    });

    describe('isValidCurrencyFormat - Edge Cases', () => {
      test('should validate various currency formats', () => {
        const validFormats = [
          '$49.99', '€49,99', '£49.99', '49.99€', '49,99 €',
          'USD 49.99', 'EUR 49.99', 'GBP 49.99', 'CHF 49.99',
          '$1,234.56', '€1.234,56', '$0.00', '$999999.99'
        ];

        const invalidFormats = [
          '$', '€', '£', '$abc', '€49,99,99', '$$49.99',
          '$49.99.99', '49.99 49.99 $', '', null, undefined
        ];

        validFormats.forEach(format => {
          const result = parser.isValidCurrencyFormat(format);
          if (result !== true) {
            console.log(`Valid format failing: "${format}" -> got: ${result}`);
          }
          expect(result).toBe(true);
        });

        invalidFormats.forEach(format => {
          const result = parser.isValidCurrencyFormat(format);
          if (result !== false) {
            console.log(`Invalid format passing: "${format}" -> got: ${result}`);
          }
          expect(result).toBe(false);
        });
      });
    });
  });

  describe('Report Generation - Edge Cases', () => {
    describe('calculateTotalSpent - Edge Cases', () => {
      test('should handle invoices with invalid total amounts', () => {
        const invoices = [
          { total: '$49.99' },
          { total: '€29,99' },
          { total: 'invalid' },
          { total: null },
          { total: '$1,234.56' },
          { total: '' }
        ];

        const result = parser.calculateTotalSpent(invoices);
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0); // Should still calculate valid amounts
      });

      test('should handle empty invoice arrays', () => {
        expect(parser.calculateTotalSpent([])).toBe(0);
        expect(parser.calculateTotalSpent(null)).toBe(0);
        expect(parser.calculateTotalSpent(undefined)).toBe(0);
      });
    });

    describe('generateReport - Edge Cases', () => {
      test('should handle empty invoice arrays', () => {
        const result = parser.generateReport([]);
        expect(result.summary.totalInvoices).toBe(0);
        expect(result.summary.totalSpent).toBe(0);
        expect(result.invoices).toEqual([]);
      });

      test('should handle null and undefined inputs', () => {
        const nullResult = parser.generateReport(null);
        expect(nullResult.summary.totalInvoices).toBe(0);
        expect(nullResult.summary.totalSpent).toBe(0);

        const undefinedResult = parser.generateReport(undefined);
        expect(undefinedResult.summary.totalInvoices).toBe(0);
        expect(undefinedResult.summary.totalSpent).toBe(0);
      });
    });
  });

  describe('File System Operations - Edge Cases', () => {
    describe('parseInvoice - Error Handling', () => {
      test('should handle non-existent files', async () => {
        const result = await parser.parseInvoice('/non/existent/file.pdf');
        expect(result).toBeNull();
      });

      test('should handle invalid file extensions', async () => {
        const result = await parser.parseInvoice('/tmp/test.txt');
        expect(result).toBeNull();
      });

      test('should handle null and undefined file paths', async () => {
        const result1 = await parser.parseInvoice(null);
        const result2 = await parser.parseInvoice(undefined);
        expect(result1).toBeNull();
        expect(result2).toBeNull();
      });
    });
  });

  describe('Performance and Scalability - Edge Cases', () => {
    test('should handle very large text inputs efficiently', () => {
      const largeText = 'Line of text\n'.repeat(10000) + 'Order #123-4567890-1234567\nTotal: $49.99';
      const startTime = Date.now();

      const result = parser.extractInvoiceData(largeText);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result).toBeTruthy();
    });

    test('should handle arrays of various sizes in report generation', () => {
      const smallInvoices = [{ total: '$10.00' }];
      const largeInvoices = Array(1000).fill().map((_, i) => ({ total: `$${i + 1}.00` }));

      const smallResult = parser.generateReport(smallInvoices);
      const largeResult = parser.generateReport(largeInvoices);

      expect(smallResult.summary.totalInvoices).toBe(1);
      expect(largeResult.summary.totalInvoices).toBe(1000);
      expect(largeResult.summary.totalSpent).toBeGreaterThan(smallResult.summary.totalSpent);
    });
  });
});