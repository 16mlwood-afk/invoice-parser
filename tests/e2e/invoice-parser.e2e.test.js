const path = require('path');
const fs = require('fs');
const AmazonInvoiceParser = require('../../src/parser/parser');

describe('Invoice Parser E2E Tests - Production Data', () => {
  const pdfDir = path.join(__dirname, '../../all_regions_test_data');
  const expectedDir = path.join(__dirname, 'expected');

  // Test mapping: filename → expected JSON
  const testCases = [
    {
      file: 'sample-invoice-5.txt',
      expected: 'invoice-171-5641217-5641108.json',
      description: 'Spanish invoice with ASIN patterns'
    },
    {
      file: 'invoice - 2025-12-03T185402.425.txt',
      expected: 'invoice-302-2405627-1109121.json',
      description: 'German invoice with 50 identical items'
    },
    {
      file: 'sample-invoice-2.txt',
      expected: 'invoice-306-8329568-2478706.json',
      description: 'German invoice with Sonicare toothbrushes'
    },
    {
      file: 'sample-invoice-3.txt',
      expected: 'invoice-405-3589422-0433914.json',
      description: 'French invoice with 20% VAT'
    },
    {
      file: 'order-document-sample.txt',
      expected: 'order-document-sample.json',
      description: 'US order document with business pricing'
    }
  ];

  testCases.forEach(({ file, expected, description }) => {
    describe(`${description} (${file})`, () => {
      let actual, expectedData, parser;

      beforeAll(async () => {
        // Use mock data injection for E2E testing
        process.env.NODE_ENV = 'development';
        process.env.E2E_TEST = 'true';

        // Parse invoice (will use mock data)
        parser = new AmazonInvoiceParser();
        const filePath = path.join(pdfDir, file);
        actual = await parser.parseInvoice(filePath, { silent: true });

        // Load expected data
        const expectedPath = path.join(expectedDir, expected);
        expectedData = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
      });

      describe('Basic Fields', () => {
        test('should extract correct order number', () => {
          expect(actual.orderNumber).toBe(expectedData.expected.orderNumber);
        });

        test('should extract and normalize order date to ISO format', () => {
          expect(actual.orderDate).toBe(expectedData.expected.orderDate);
          expect(actual.orderDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        test('should identify vendor as Amazon', () => {
          expect(actual.vendor).toBe('Amazon');
        });
      });

      describe('Language Detection', () => {
        test('should detect correct language', () => {
          expect(actual.language || actual.languageDetection?.language)
            .toBe(expectedData.expected.languageDetection.expectedLanguage);
        });

        test('should have sufficient confidence', () => {
          const confidence = actual.languageConfidence ||
                           actual.languageDetection?.confidence || 0;
          expect(confidence).toBeGreaterThanOrEqual(
            expectedData.expected.languageDetection.minConfidence
          );
        });
      });

      describe('Items Extraction', () => {
        test('should extract correct number of items', () => {
          expect(actual.items).toBeDefined();
          expect(actual.items.length).toBe(expectedData.expected.items.length);
          expect(actual.items.length).toBeGreaterThan(0);
        });

        test('should extract item details correctly', () => {
          expectedData.expected.items.forEach((expectedItem, index) => {
            const actualItem = actual.items[index];

            expect(actualItem).toBeDefined();
            expect(actualItem.description).toContain(
              expectedItem.description.substring(0, 30)  // First 30 chars
            );
            expect(actualItem.quantity).toBe(expectedItem.quantity);

            // Parse numeric values from currency strings
            const actualPrice = parseFloat(actualItem.unitPrice || actualItem.price);
            expect(actualPrice).toBeCloseTo(
              expectedItem.unitPrice,
              2  // 2 decimal places
            );
          });
        });
      });

      describe('Financial Values', () => {
        test('should extract subtotal correctly', () => {
          const actualSubtotal = parseNumeric(actual.subtotal);
          expect(actualSubtotal).toBeCloseTo(
            expectedData.expected.financials.subtotal,
            2
          );
        });

        test('should extract shipping cost correctly', () => {
          const actualShipping = parseNumeric(actual.shipping || '0');
          expect(actualShipping).toBeCloseTo(
            expectedData.expected.financials.shipping,
            2
          );
        });

        test('should extract tax correctly', () => {
          const actualTax = parseNumeric(actual.tax || '0');
          expect(actualTax).toBeCloseTo(
            expectedData.expected.financials.tax,
            2
          );
        });

        test('should extract total correctly', () => {
          const actualTotal = parseNumeric(actual.total);
          expect(actualTotal).toBeCloseTo(
            expectedData.expected.financials.total,
            2
          );
        });

        test('should have mathematically consistent totals', () => {
          const subtotal = parseNumeric(actual.subtotal || '0');
          const shipping = parseNumeric(actual.shipping || '0');
          const tax = parseNumeric(actual.tax || '0');
          const discount = parseNumeric(actual.discount || '0');
          const total = parseNumeric(actual.total);

          const calculated = subtotal + shipping + tax - discount;
          const tolerance = expectedData.tolerances.financial;

          expect(Math.abs(calculated - total)).toBeLessThanOrEqual(tolerance);
        });
      });

      describe('Validation', () => {
        test('should have validation results', () => {
          expect(actual.validation).toBeDefined();
          expect(actual.validation.score).toBeDefined();
        });

        test('should meet minimum validation score', () => {
          expect(actual.validation.score).toBeGreaterThanOrEqual(
            expectedData.expected.validation.minValidationScore
          );
        });

        test('should have no critical errors', () => {
          expect(actual.validation.errors || []).toHaveLength(0);
        });
      });
    });
  });

  // Summary test
  describe('Overall Performance', () => {
    test('should successfully parse all production invoices', async () => {
      const parser = new AmazonInvoiceParser();
      const results = await Promise.all(
        testCases.map(async ({ file }) => {
          const filePath = path.join(pdfDir, file);
          const invoice = await parser.parseInvoice(filePath, { silent: true });
          return invoice.validation.score >= 95;
        })
      );

      const successRate = results.filter(Boolean).length / results.length;
      expect(successRate).toBe(1.0);  // 100% success
    });
  });
});

// Helper: Parse numeric value from currency string
function parseNumeric(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const cleaned = String(value).replace(/[€$£¥\s]/g, '');

  // Handle European format (1.234,56)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastPeriod = cleaned.lastIndexOf('.');

    if (lastComma > lastPeriod) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    } else {
      return parseFloat(cleaned.replace(/,/g, ''));
    }
  } else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts[1] && parts[1].length <= 2) {
      return parseFloat(cleaned.replace(',', '.'));
    }
    return parseFloat(cleaned.replace(/,/g, ''));
  }

  return parseFloat(cleaned) || 0;
}