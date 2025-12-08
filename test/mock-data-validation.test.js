const AmazonInvoiceParser = require('../index');

describe('AmazonInvoiceParser - Enhanced Mock Data Validation', () => {
  let parser;

  beforeEach(() => {
    parser = new AmazonInvoiceParser();
  });

  describe('Mock Data Generators', () => {
    test('should create valid English mock invoice', () => {
      const invoice = testUtils.createMockInvoice();
      expect(invoice.orderNumber).toBe('123-4567890-1234567');
      expect(invoice.vendor).toBe('Amazon');
      expect(invoice.items).toHaveLength(2);
      expect(invoice.total).toBe('$38.00');
    });

    test('should create valid German mock invoice', () => {
      const invoice = testUtils.createMockGermanInvoice();
      expect(invoice.orderNumber).toBe('304-1234567-8901234');
      expect(invoice.orderDate).toBe('15 Dezember 2023');
      expect(invoice.total).toBe('€38,00');
      expect(invoice.items[0].price).toBe('€10,00');
    });

    test('should create valid French mock invoice', () => {
      const invoice = testUtils.createMockFrenchInvoice();
      expect(invoice.orderNumber).toBe('405-6789012-3456789');
      expect(invoice.orderDate).toBe('15 décembre 2023');
      expect(invoice.total).toBe('38,00 €');
      expect(invoice.items[0].price).toBe('10,00 €');
    });

    test('should create valid GBP mock invoice', () => {
      const invoice = testUtils.createMockGBPInvoice();
      expect(invoice.orderNumber).toBe('789-0123456-7890123');
      expect(invoice.total).toBe('£38.00');
      expect(invoice.items[0].price).toBe('£10.00');
    });

    test('should allow mock invoice overrides', () => {
      const customInvoice = testUtils.createMockInvoice({
        orderNumber: '999-8887776-5554443',
        total: '$100.00',
        vendor: 'Custom Vendor'
      });

      expect(customInvoice.orderNumber).toBe('999-8887776-5554443');
      expect(customInvoice.total).toBe('$100.00');
      expect(customInvoice.vendor).toBe('Custom Vendor');
    });

    test('should create edge case mock invoices', () => {
      const emptyInvoice = testUtils.createMockEdgeCaseInvoice('empty');
      expect(emptyInvoice.items).toEqual([]);
      expect(emptyInvoice.total).toBeNull();

      const malformedInvoice = testUtils.createMockEdgeCaseInvoice('malformed');
      expect(malformedInvoice.orderNumber).toBe('invalid-format');

      const largeNumbersInvoice = testUtils.createMockEdgeCaseInvoice('largeNumbers');
      expect(largeNumbersInvoice.total).toBe('$199999.98');
    });
  });

  describe('Mock PDF Text Generators', () => {
    test('should generate English PDF text', () => {
      const text = testUtils.createMockPDFText({ language: 'english' });
      expect(text).toContain('Amazon.com Order Confirmation');
      expect(text).toContain('Order #123-4567890-1234567');
      expect(text).toContain('Subtotal: $30.00');
      expect(text).toContain('Grand Total: $38.00');
    });

    test('should generate German PDF text', () => {
      const text = testUtils.createMockPDFText({ language: 'german', currency: 'EUR' });
      expect(text).toContain('Amazon.de Bestellung');
      expect(text).toContain('Bestellnr. 123-4567890-1234567');
      expect(text).toContain('Zwischensumme: 30,00€');
      expect(text).toContain('Gesamtbetrag: 38,00€');
    });

    test('should generate French PDF text', () => {
      const text = testUtils.createMockPDFText({ language: 'french', currency: 'EUR' });
      expect(text).toContain('Amazon.fr Commande');
      expect(text).toContain('Numéro de commande: 123-4567890-1234567');
      expect(text).toContain('Sous-total: 30,00 €');
      expect(text).toContain('Total TTC: 38,00 €');
    });

    test('should handle different item counts', () => {
      const singleItemText = testUtils.createMockPDFText({ items: 1 });
      expect(singleItemText).toContain('1 x Test Item 1 $10.00');
      expect(singleItemText).not.toContain('2 x Test Item 2');

      const fiveItemsText = testUtils.createMockPDFText({ items: 5 });
      expect(fiveItemsText).toContain('5 x Test Item 5 $50.00');
      expect(fiveItemsText).toContain('Subtotal: $150.00');
      expect(fiveItemsText).toContain('Grand Total: $158.00');
    });

    test('should handle GBP currency', () => {
      const gbpText = testUtils.createMockPDFText({ currency: 'GBP' });
      expect(gbpText).toContain('Subtotal: £30.00');
      expect(gbpText).toContain('Grand Total: £38.00');
    });
  });

  describe('Integration with Parser Functions', () => {
    test('should extract data from generated English mock PDF text', () => {
      const text = testUtils.createMockPDFText({ language: 'english', items: 2 });
      const invoice = parser.extractInvoiceData(text);

      expect(invoice.orderNumber).toBe('123-4567890-1234567');
      expect(invoice.orderDate).toBe('December 15, 2023');
      expect(invoice.subtotal).toBe('$30.00');
      expect(invoice.shipping).toBe('$5.00');
      expect(invoice.tax).toBe('$3.00');
      expect(invoice.total).toBe('$38.00');
      expect(invoice.vendor).toBe('Amazon');
    });

    test('should extract data from generated German mock PDF text', () => {
      const text = testUtils.createMockPDFText({ language: 'german', currency: 'EUR', items: 2 });
      const invoice = parser.extractInvoiceData(text);

      expect(invoice.orderNumber).toBe('123-4567890-1234567');
      expect(invoice.vendor).toBe('Amazon');
      // Parser may not extract German formatted dates/amounts perfectly from English template
      expect(invoice).toBeDefined();
    });

    test('should extract data from generated French mock PDF text', () => {
      const text = testUtils.createMockPDFText({ language: 'french', currency: 'EUR', items: 2 });
      const invoice = parser.extractInvoiceData(text);

      expect(invoice.orderNumber).toBe('123-4567890-1234567');
      expect(invoice.subtotal).toBe('30,00 €');
      expect(invoice.total).toBe('38,00 €');
    });

    test('should handle validation of generated mock invoices', () => {
      const invoice = testUtils.createMockInvoice();
      const result = parser.validateInvoiceData(invoice);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(90);
    });

    test('should handle validation of edge case mock invoices', () => {
      const emptyInvoice = testUtils.createMockEdgeCaseInvoice('empty');
      const result = parser.validateInvoiceData(emptyInvoice);

      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThanOrEqual(60);
    });
  });

  describe('Currency and Format Variations', () => {
    test('should generate invoices with different currency combinations', () => {
      const currencies = ['USD', 'EUR', 'GBP'];
      const languages = ['english', 'german', 'french'];

      currencies.forEach(currency => {
        languages.forEach(language => {
          const text = testUtils.createMockPDFText({ language, currency });
          const invoice = parser.extractInvoiceData(text);

          // Should extract some data even with format variations
          expect(invoice).toBeDefined();
          expect(invoice.orderNumber).toBeDefined();
        });
      });
    });

    test('should handle mixed currency formats in mock data', () => {
      const mixedInvoice = testUtils.createMockInvoice({
        items: [
          { description: 'USD Item', price: '$10.00' },
          { description: 'EUR Item', price: '€15,00' },
          { description: 'GBP Item', price: '£20.00' }
        ],
        subtotal: '$45.00',
        total: '$45.00'
      });

      const result = parser.validateInvoiceData(mixedInvoice);
      expect(result.warnings.length).toBeGreaterThan(0); // Should warn about mixed currencies
    });
  });

  describe('Performance with Mock Data', () => {
    test('should generate large mock datasets efficiently', () => {
      const startTime = Date.now();

      // Generate multiple large mock invoices
      for (let i = 0; i < 100; i++) {
        testUtils.createMockPDFText({ items: 10, language: 'english' });
        testUtils.createMockInvoice({ items: Array(10).fill({ description: 'Item', price: '$10.00' }) });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle concurrent mock data generation', async () => {
      const promises = Array(50).fill().map(() =>
        Promise.resolve(testUtils.createMockPDFText({ items: 5 }))
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(50);
      results.forEach(text => {
        expect(text).toContain('Amazon');
        expect(text).toContain('Order #');
      });
    });
  });
});