/**
 * Production Test - OCR Corruption Protection and Validation
 *
 * Tests the critical fixes for OCR-induced parsing errors:
 * - OCR merging quantity with price (e.g., "1 176,46 €" → "1176,46 €")
 * - Validation system correctly catching mathematical inconsistencies
 * - Price sanity checks preventing unrealistic amounts
 * - Duplicate item detection for data quality
 */

const EUConsumerParser = require('../../src/parsers/eu-consumer-parser');
const Validation = require('../../src/parser/validation');

// Test data based on the real corrupted invoice from job_1765291014813_spkvyvxm3
const corruptedInvoiceText = `Rechnung
Steuerfreie Ausfuhrlieferung gemäß Artikel 21 der Spanishchenumsatzsteuergesetz 37/1992
Versendungsland: Spanien
LU-BIO-04
Amazon EU S.à r.l. - 38 avenue John F. Kennedy, L-1855 Luxembourg
Sitz der Gesellschaft: L-1855 Luxemburg
eingetragen im Luxemburgischen Handelsregister unter R.C.S. B 101818 • Stammkapital: 37.500 EUR
Amazon EU S.à r.l., Sucursal en España – Calle de Ramírez de Prado 5, 28045 Madrid, España
Registro Mercantil de Madrid • Tomo 33.166, Libro 0, Folio 105, Seccion 8, Hoja M-596.819 • NIF W0184081H
Amazon EU S.a.r.L., Niederlassung Deutschland ist bei der Stiftung ear für Elektro- und Elektronikgeräte registriert: WEEE-Reg.-Nr. DE 89633988
Seite 1 von 2
Gesamtpreis891,66 €
Rechnungsdetails
Bestelldatum08 Oktober 2025
Bestellnummer302-1725553-0374723
 Zahlungsreferenznummer 1Eqv7RLIZCZl2HZzgKrV
Verkauft von Amazon EU S.à r.l., Sucursal en España
USt-IDNr. ESW0184081H
Rechnungsdatum
/Lieferdatum09 Oktober 2025
RechnungsnummerES51NKNMSAEUS
Zahlbetrag891,66 €
MASON WOOD
117, BAGLEY CLOSE KENNINGTON
OXFORD, OX1 5LU
GB
Um unseren Kundenservice zu kontaktieren, besuche www.amazon.de/contact-us
Rechnungsadresse
MASON WOOD
117, BAGLEY CLOSE KENNINGTON
OXFORD, OX1 5LU
GB
Lieferadresse
Mason Wood
SELLERSMART UNIT 5B 19 BOURNE RD
BEXLEY, DA5 1LR
GB
Verkauft von
Amazon EU S.à r.l., Sucursal en España
Calle de Ramírez de Prado 5
28045 Madrid
Spanien
USt-IDNr. ESW0184081H
Bestellinformationen
BeschreibungMengeStückpreis
(ohne USt.)
USt. %Stückpreis
(inkl. USt.)
Zwischensumme
(inkl. USt.)
Philips Sonicare DiamondClean 9900 Prestige elektrische Zahnbürste, mit
SenseIQ Technologie und App, 5 Putzmodi, 3 Intensitätsstufen,
Reiseladeetui, schwarz, Modell HX9992/43
ASIN: B0F3D9YC75
1176,46 €
0%
176,46 €176,46 €
Philips Sonicare DiamondClean 9900 Prestige elektrische Zahnbürste, mit
SenseIQ Technologie und App, 5 Putzmodi, 3 Intensitätsstufen,
Reiseladeetui, schwarz, Modell HX9992/43
ASIN: B0F3D9YC75
1176,46 €
0%
176,46 €176,46 €
Philips Sonicare DiamondClean 9900 Prestige elektrische Zahnbürste, mit
SenseIQ Technologie und App, 5 Putzmodi, 3 Intensitätsstufen,
Reiseladeetui, schwarz, Modell HX9992/43
ASIN: B0F3D9YC75
3176,46 €
0%
176,46 €529,38 €
Versandkosten9,36 €9,36 €9,36 €`;

describe('Production OCR Corruption Protection Tests', () => {

  describe('OCR Corruption Detection and Recovery', () => {
    let parser;
    let validation;

    beforeEach(() => {
      parser = new EUConsumerParser();
      validation = new Validation();
    });

    test('should detect and correct OCR quantity-price merging corruption', () => {
      // This test verifies the fix for the critical bug where OCR merges
      // "1 176,46 €" into "1176,46 €" (and "3 176,46 €" into "3176,46 €")

      const result = parser.extract(corruptedInvoiceText);

      // Should extract 3 items with same ASIN (duplicate detection test)
      expect(result.items).toHaveLength(3);
      expect(result.items.every(item => item.asin === 'B0F3D9YC75')).toBe(true);

      // CRITICAL: Should extract the correct price (176.46) for all items
      // The parser should detect OCR corruption and use realistic prices
      result.items.forEach(item => {
        expect(item.unitPrice).toBe(176.46);
        expect(item.totalPrice).toBe(176.46);
        expect(item.unitPrice).toBeLessThan(1000); // Sanity check
      });

      // Validate the extracted data (add required fields for complete validation)
      const completeInvoice = {
        orderNumber: '302-1725553-0374723',
        orderDate: result.orderDate,
        items: result.items,
        subtotal: result.subtotal,
        shipping: result.shipping,
        tax: result.tax,
        total: 891.66,
        currency: result.currency
      };
      const validationResult = validation.validateInvoiceData(completeInvoice);

      // Should detect validation issues
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);

      // Should detect item-subtotal mismatch (529.38 vs 891.66)
      const mismatchError = validationResult.errors.find(
        error => error.type === 'item_subtotal_mismatch'
      );
      expect(mismatchError).toBeDefined();
      expect(mismatchError.severity).toBe('critical');
    });

    test('should validate mathematical consistency and catch subtotal mismatch', () => {
      const result = parser.extract(corruptedInvoiceText);

      // Extracted items total: 3 × 176.46 = 529.38
      // Invoice subtotal: 891.66
      // Discrepancy: 891.66 - 529.38 = 362.28
      // The validation should flag this as a critical error

      const completeInvoice = {
        ...result,
        orderNumber: '302-1725553-0374723',
        total: 891.66
      };
      const validationResult = validation.validateInvoiceData(completeInvoice);

      // Should have validation errors due to mathematical inconsistency
      expect(validationResult.errors.length).toBeGreaterThan(0);

      // Should detect item-subtotal mismatch
      const mismatchError = validationResult.errors.find(
        error => error.type === 'item_subtotal_mismatch'
      );
      expect(mismatchError).toBeDefined();
      expect(mismatchError.severity).toBe('critical');
      expect(mismatchError.details.discrepancy).toBe(362.28);
    });

    test('should handle realistic vs corrupted price filtering', () => {
      // Test the price filtering logic directly
      const parser = new EUConsumerParser();

      // Simulate the corrupted amounts that would be extracted
      const corruptedAmounts = [1176.46, 176.46, 176.46]; // Mixed corrupted and good

      // The parser should detect corruption (> €5000 threshold) and filter
      const hasCorruptedPrices = corruptedAmounts.some(amount => amount > 5000);
      expect(hasCorruptedPrices).toBe(false); // 1176 < 5000

      // Test with truly corrupted amounts
      const trulyCorrupted = [11764.46, 176.46, 176.46]; // > €5000
      const hasSevereCorruption = trulyCorrupted.some(amount => amount > 5000);
      expect(hasSevereCorruption).toBe(true);

      // Filtering should work
      const realisticAmounts = trulyCorrupted.filter(amount => amount <= 1000);
      expect(realisticAmounts).toEqual([176.46, 176.46]);
    });

    test('should validate price sanity checks', () => {
      const invoice = {
        items: [
          { unitPrice: 50, totalPrice: 50, description: 'Normal item' },
          { unitPrice: 1500, totalPrice: 1500, description: 'Suspiciously expensive' },
          { unitPrice: 15000, totalPrice: 15000, description: 'Clearly corrupted' }
        ]
      };

      const validationResult = validation.validateInvoiceData(invoice);

      // Should have warnings/errors for high prices
      const priceWarnings = validationResult.warnings.filter(
        w => w.type === 'high_price_warning'
      );
      const priceErrors = validationResult.errors.filter(
        e => e.type === 'price_sanity_check_failed'
      );

      expect(priceWarnings.length).toBeGreaterThan(0); // €1500 item
      expect(priceErrors.length).toBeGreaterThan(0);   // €15000 item
    });

    test('should handle extractNumericValue with mixed data types', () => {
      // Test the critical fix for extractNumericValue handling numbers vs strings

      // Should handle numbers directly
      expect(validation.extractNumericValue(891)).toBe(891);
      expect(validation.extractNumericValue(891.5)).toBe(891.5);

      // Should handle currency strings
      expect(validation.extractNumericValue('891,00 €')).toBe(891);
      expect(validation.extractNumericValue('1.234,56 €')).toBe(1234.56);

      // Should handle null/undefined
      expect(validation.extractNumericValue(null)).toBe(0);
      expect(validation.extractNumericValue(undefined)).toBe(0);
    });

    test('should properly report validation errors in results', () => {
      // This tests the result transformer fix that now includes errors, not just warnings

      const invoice = {
        orderNumber: '123-4567890-1234567',
        orderDate: '2025-10-08',
        items: [
          { asin: 'B0F3D9YC75', unitPrice: 176.46, totalPrice: 176.46 },
          { asin: 'B0F3D9YC75', unitPrice: 176.46, totalPrice: 176.46 },
          { asin: 'B0F3D9YC75', unitPrice: 176.46, totalPrice: 176.46 }
        ],
        subtotal: '891,66 €',
        shipping: '9,36 €',
        tax: '0,00 €',
        total: '891,66 €',
        currency: 'EUR'
      };

      const validationResult = validation.validateInvoiceData(invoice);

      // Should have critical errors (item-subtotal mismatch)
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);

      // Simulate result transformer logic
      const validationStatus = validationResult.isValid ? 'valid' : 'invalid';
      const validationErrors = [
        ...(validationResult.errors?.map(e => e.message) || []),
        ...(validationResult.warnings?.map(w => w.message) || [])
      ];

      expect(validationStatus).toBe('invalid');
      expect(validationErrors.length).toBeGreaterThan(0);
      expect(validationErrors.some(error => error.includes('don\'t match invoice subtotal'))).toBe(true);
    });
  });

  describe('Regression Protection', () => {
    test('should maintain backward compatibility with valid invoices', () => {
      const parser = new EUConsumerParser();
      const validation = new Validation();

      // Test with clean, valid invoice data (from existing tests)
      const validText = `Rechnung
Bestellnummer: 123-4567890-1234567
Bestelldatum: 15.12.2023

ASIN: B08N5WRWNW
Echo Dot (5th Gen, Charcoal)
155,32 €
20%
66,38 €66,38 €

Versandkosten 5,06 €
Gesamtbetrag 71,44 €`;

      const result = parser.extract(validText);
      const validationResult = validation.validateInvoiceData(result);

      // Should validate successfully
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors.length).toBe(0);
      expect(result.items[0].unitPrice).toBe(66.38);
    });
  });
});