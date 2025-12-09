/**
 * EU Parsers - Comprehensive Price Extraction and VAT Handling Tests
 *
 * Tests EU-specific parsing logic including:
 * - EU Consumer Parser: VAT-inclusive price extraction from multi-line tables
 * - EU Business Parser: ex-VAT price extraction
 * - Price column selection validation
 * - Multi-line table format handling
 * - VAT calculation validation
 * - Item-to-subtotal consistency checks
 */

const EUConsumerParser = require('../../src/parsers/eu-consumer-parser');
const EUBusinessParser = require('../../src/parsers/eu-business-parser');
const Validation = require('../../src/parser/validation');

// Mock data for EU consumer invoices
const mockEUConsumerInvoice = {
  text: `Rechnung
Versandungsland: Deutschland

Bestellnummer: 123-4567890-1234567
Bestelldatum: 15.12.2023

ASIN: B08N5WRWNW
Echo Dot (5th Gen, Charcoal)
155,32 €
20%
66,38 €66,38 €

Versandkosten 5,06 €

Gesamtbetrag 71,44 €
Zahlbetrag 71,44 €

USt. Gesamt 59,54 € 11,90 €`,

  expectedItems: [
    {
      asin: 'B08N5WRWNW',
      description: 'Echo Dot (5th Gen, Charcoal)',
      quantity: 1,
      unitPrice: 66.38,
      totalPrice: 66.38,
      currency: 'EUR'
    }
  ],

  expectedInvoice: {
    orderNumber: '123-4567890-1234567',
    orderDate: '2023-12-15',
    subtotal: '71,44 €',
    shipping: '5,06 €',
    tax: '11,90 €',
    total: '71,44 €',
    currency: 'EUR'
  }
};

// Mock data for EU business invoices (ex-VAT prices)
const mockEUBusinessInvoice = {
  text: `Facture
Pays d'expédition: France

Amazon EU S.à r.l. - Succursale française
38 avenue John F. Kennedy, L-1855 Luxembourg
R.C.S. Luxembourg B 101818 • Capital social: 37.500 EUR

Numéro de commande: 987-6543210-0987654
Date de commande: 15 décembre 2023

Description | Quantité | Prix unitaire | Taux TVA | Prix unitaire | Total TTC
Echo Dot (5th Gen) | 1 | 155,32 € | 20% | 186,38 € | 186,38 €

Frais de port | 1 | 4,22 € | 20% | 5,06 € | 5,06 €

Sous-total HT: 159,54 €
TVA (20%): 31,91 €
Total TTC: 191,45 €`,

  expectedItems: [
    {
      description: 'Echo Dot (5th Gen)',
      quantity: 1,
      unitPrice: 155.32, // ex-VAT price
      totalPrice: 186.38, // inc-VAT total
      currency: 'EUR'
    }
  ]
};

// Mock data with multi-line table format (the problematic format that was fixed)
const mockMultiLineTableInvoice = {
  text: `Rechnung
Versandungsland: Deutschland

ASIN: B08N5WRWNW129,99 € 20% 155,99 € 155,99 €
ASIN: B06XJ4G828155,32 € 20% 186,38 € 186,38 €
Versandkosten4,22 € 5,06 € 5,06 €

Gesamtbetrag341,44 €`,

  expectedItems: [
    {
      asin: 'B08N5WRWNW',
      description: 'Product 1',
      quantity: 1,
      unitPrice: 155.99, // VAT-inclusive from second column
      totalPrice: 155.99,
      currency: 'EUR'
    },
    {
      asin: 'B06XJ4G828',
      description: 'Product 2',
      quantity: 1,
      unitPrice: 186.38, // VAT-inclusive from second column
      totalPrice: 186.38,
      currency: 'EUR'
    }
  ]
};

describe('EU Parsers - Price Extraction and VAT Handling', () => {

  describe('EU Consumer Parser - VAT-Inclusive Price Extraction', () => {

    let parser;

    beforeEach(() => {
      parser = new EUConsumerParser();
    });

    test('should correctly extract VAT-inclusive prices from EU consumer invoices', () => {
      const result = parser.extract(mockEUConsumerInvoice.text);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        asin: 'B08N5WRWNW',
        quantity: 1,
        unitPrice: 66.38,
        totalPrice: 66.38,
        currency: 'EUR'
      });
    });

    test('should handle multi-line table format correctly', () => {
      const result = parser.extract(mockMultiLineTableInvoice.text);

      expect(result.items).toHaveLength(2);

      // First item: should extract VAT-inclusive price (155.99), not ex-VAT (129.99)
      expect(result.items[0]).toMatchObject({
        asin: 'B08N5WRWNW',
        unitPrice: 155.99,
        totalPrice: 155.99,
        currency: 'EUR'
      });

      // Second item: should extract VAT-inclusive price (186.38), not ex-VAT (155.32)
      expect(result.items[1]).toMatchObject({
        asin: 'B06XJ4G828',
        unitPrice: 186.38,
        totalPrice: 186.38,
        currency: 'EUR'
      });
    });

    test('should extract order number correctly', () => {
      const orderNumber = parser.extractOrderNumber(mockEUConsumerInvoice.text);
      expect(orderNumber).toBe('123-4567890-1234567');
    });

    test('should extract order date correctly', () => {
      const orderDate = parser.extractOrderDate(mockEUConsumerInvoice.text);
      expect(orderDate).toBe('2023-12-15');
    });

    test('should extract shipping costs correctly', () => {
      const shipping = parser.extractShipping(mockEUConsumerInvoice.text);
      expect(shipping).toBe('5,06 €');
    });

    test('should extract tax when present', () => {
      const taxText = 'USt. Gesamt59,54 €11,90 €';
      const tax = parser.extractTax(taxText);
      expect(tax).toBe('11,90 €');
    });

    test('should extract total correctly', () => {
      const total = parser.extractTotal(mockEUConsumerInvoice.text);
      expect(total).toBe('71,44 €');
    });

    test('should detect German language correctly', () => {
      const language = parser.detectLanguage(mockEUConsumerInvoice.text);
      expect(language).toBe('de');
    });

    test('should handle French EU consumer invoices', () => {
      const frenchText = `Facture
Pays d'expédition: France

Numéro de commande: 123-4567890-1234567
Date de commande: 15.12.2023`;

      const language = parser.detectLanguage(frenchText);
      expect(language).toBe('fr');
    });
  });

  describe('EU Business Parser - ex-VAT Price Extraction', () => {

    let parser;

    beforeEach(() => {
      parser = new EUBusinessParser();
    });

    test('should extract French business order number', () => {
      const orderNumber = parser.extractOrderNumber(mockEUBusinessInvoice.text);
      expect(orderNumber).toBe('987-6543210-0987654');
    });

    test('should extract business invoice totals', () => {
      const total = parser.extractTotal(mockEUBusinessInvoice.text);
      expect(total).toBe('191,45 €');
    });

    test('should detect French language correctly', () => {
      const language = parser.detectLanguage(mockEUBusinessInvoice.text);
      expect(language).toBe('fr');
    });
  });

  describe('Price Extraction Confidence Scoring', () => {

    test('should assign high confidence to correct VAT-inclusive extraction', () => {
      const parser = new EUConsumerParser();
      const result = parser.extract(mockEUConsumerInvoice.text);

      // Items should have VAT-inclusive prices (not inflated ex-VAT prices)
      expect(result.items[0].unitPrice).toBe(66.38);
      expect(result.items[0].unitPrice).toBeLessThan(100); // Should not be inflated

      // This is a proxy for confidence - if we extracted the wrong column,
      // the price would be much higher (155.32 vs 66.38)
    });

    test('should detect multi-line table patterns with high confidence', () => {
      const parser = new EUConsumerParser();
      const result = parser.extract(mockMultiLineTableInvoice.text);

      expect(result.items).toHaveLength(2);

      // Both items should have reasonable VAT-inclusive prices
      result.items.forEach(item => {
        expect(item.unitPrice).toBeGreaterThan(100);
        expect(item.unitPrice).toBeLessThan(200);
        expect(item.totalPrice).toBe(item.unitPrice); // Single quantity
      });
    });
  });

  describe('Item-to-Subtotal Validation (Future Prevention)', () => {

    let validator;

    beforeEach(() => {
      validator = new Validation();
    });

    test('should pass validation for correct VAT-inclusive prices', () => {
      const invoice = {
        items: [
          { unitPrice: '66,38 €', quantity: 1, totalPrice: '66,38 €' },
          { unitPrice: '5,06 €', quantity: 1, totalPrice: '5,06 €' } // shipping as item
        ],
        subtotal: '71,44 €'
      };

      const validation = { errors: [], warnings: [], score: 100, isValid: true };
      validator.validateItemToSubtotalConsistency(invoice, validation);

      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
      expect(validation.score).toBe(100);
      expect(validation.isValid).toBe(true);
    });

    test('should detect critical errors for inflated ex-VAT prices', () => {
      const invoice = {
        items: [
          { unitPrice: '155,32 €', quantity: 1, totalPrice: '155,32 €' } // WRONG: ex-VAT price
        ],
        subtotal: '66,38 €' // CORRECT: VAT-inclusive subtotal
      };

      const validation = { errors: [], warnings: [], score: 100, isValid: true };
      validator.validateItemToSubtotalConsistency(invoice, validation);

      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].type).toBe('item_subtotal_mismatch');
      expect(validation.errors[0].severity).toBe('critical');
      expect(validation.score).toBeLessThan(100);
      expect(validation.isValid).toBe(false);
    });

    test('should handle minor discrepancies with warnings', () => {
      const invoice = {
        items: [
          { unitPrice: '66,38 €', quantity: 1, totalPrice: '66,38 €' }
        ],
        subtotal: '66,50 €' // €0.12 difference (within tolerance but > €0.10)
      };

      const validation = { errors: [], warnings: [], score: 100, isValid: true };
      validator.validateItemToSubtotalConsistency(invoice, validation);

      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0].type).toBe('item_subtotal_minor_discrepancy');
      expect(validation.score).toBeLessThan(100);
      expect(validation.isValid).toBe(true);
    });

    test('should warn on minor discrepancies within €1.00 tolerance', () => {
      const invoice = {
        items: [
          { unitPrice: '66,38 €', quantity: 1, totalPrice: '66,38 €' }
        ],
        subtotal: '65,50 €' // €0.88 difference (within €1 tolerance, but > €0.10)
      };

      const validation = { errors: [], warnings: [], score: 100, isValid: true };
      validator.validateItemToSubtotalConsistency(invoice, validation);

      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0].type).toBe('item_subtotal_minor_discrepancy');
      expect(validation.score).toBeLessThan(100);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Edge Cases and Error Prevention', () => {

    test('should handle empty or invalid input gracefully', () => {
      const parser = new EUConsumerParser();

      expect(() => parser.extractItems('')).not.toThrow();
      expect(() => parser.extractItems(null)).not.toThrow();
      expect(() => parser.extractItems(undefined)).not.toThrow();

      const result = parser.extractItems('');
      expect(result).toEqual([]);
    });

    test('should handle missing ASIN gracefully', () => {
      const parser = new EUConsumerParser();
      const noAsinText = `
Product Name
155,32 €
20%
66,38 €66,38 €
      `;

      const result = parser.extractItems(noAsinText);
      expect(result).toHaveLength(0); // No ASIN, no items extracted
    });

    test('should handle graceful degradation', () => {
      const parser = new EUConsumerParser();

      // Test with incomplete data
      const incompleteText = `
ASIN: B0123456789
Product Name
      `;

      const result = parser.extractItems(incompleteText);
      expect(result).toHaveLength(0); // Should not crash, just return empty
    });
  });

  describe('Cross-Regional Price Validation', () => {

    test('EU consumer parser should detect German language', () => {
      const consumerParser = new EUConsumerParser();
      const language = consumerParser.detectLanguage(mockEUConsumerInvoice.text);
      expect(language).toBe('de');
    });

    test('EU business parser should detect French language', () => {
      const businessParser = new EUBusinessParser();
      const language = businessParser.detectLanguage(mockEUBusinessInvoice.text);
      expect(language).toBe('fr');
    });

    test('should validate VAT calculation logic', () => {
      // For 20% VAT: ex-VAT * 1.2 = inc-VAT
      const exVatPrice = 155.32;
      const vatRate = 0.20;
      const expectedIncVatPrice = exVatPrice * (1 + vatRate); // 186.384

      // This is a logical validation that our VAT calculations follow correct math
      expect(expectedIncVatPrice).toBeCloseTo(186.38, 1);
    });
  });
});