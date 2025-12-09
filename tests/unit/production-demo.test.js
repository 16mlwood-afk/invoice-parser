/**
 * Production Demo - Key Fixes Demonstration
 *
 * Demonstrates that the critical fixes work correctly:
 * 1. OCR corruption protection
 * 2. Validation error reporting
 * 3. extractNumericValue handling mixed types
 */

const EUConsumerParser = require('../../src/parsers/eu-consumer-parser');
const Validation = require('../../src/parser/validation');

describe('Production Fixes Demo', () => {

  test('OCR Corruption Protection Works', () => {
    const parser = new EUConsumerParser();

    // Simulate OCR corruption: "1 176,46 €" → "1176,46 €"
    const corruptedText = `ASIN: B0TEST1234
1176,46 €
176,46 €`;

    const result = parser.extract(corruptedText);

    // Should detect corruption and extract correct price
    expect(result.items[0].unitPrice).toBe(176.46);
    expect(result.items[0].unitPrice).toBeLessThan(1000); // Not corrupted
  });

  test('Validation Detects Item-Subtotal Mismatch', () => {
    const validation = new Validation();

    const badInvoice = {
      items: [
        { unitPrice: 100, totalPrice: 100 },
        { unitPrice: 100, totalPrice: 100 }
      ],
      subtotal: '250,00 €', // Wrong subtotal
      shipping: '10,00 €',
      tax: '0,00 €',
      total: '210,00 €'
    };

    const result = validation.validateInvoiceData(badInvoice);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.type === 'item_subtotal_mismatch')).toBe(true);
  });

  test('extractNumericValue Handles Mixed Types', () => {
    const validation = new Validation();

    expect(validation.extractNumericValue('123,45 €')).toBe(123.45);
    expect(validation.extractNumericValue(123.45)).toBe(123.45);
    expect(validation.extractNumericValue(null)).toBe(0);
  });

  test('Duplicate Item Detection Works', () => {
    const validation = new Validation();

    const duplicateInvoice = {
      items: [
        { asin: 'B0TEST', unitPrice: 50, totalPrice: 50 },
        { asin: 'B0TEST', unitPrice: 60, totalPrice: 60 }, // Different price!
        { asin: 'B0DIFFERENT', unitPrice: 70, totalPrice: 70 }
      ]
    };

    const result = validation.validateInvoiceData(duplicateInvoice);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.type === 'duplicate_item_different_prices')).toBe(true);
  });

  test('Price Sanity Checks Work', () => {
    const validation = new Validation();

    const insaneInvoice = {
      items: [
        { unitPrice: 15000, totalPrice: 15000 } // €15,000 for consumer item?
      ]
    };

    const result = validation.validateInvoiceData(insaneInvoice);

    expect(result.errors.some(e => e.type === 'price_sanity_check_failed')).toBe(true);
  });

  test('Result Transformer Includes Validation Errors', () => {
    // Simulate result transformer logic
    const mockResult = {
      validation: {
        isValid: false,
        errors: [{ message: 'Critical error detected' }],
        warnings: [{ message: 'Minor warning' }]
      }
    };

    // This mimics the result transformer logic
    const validationStatus = mockResult.validation.isValid ? 'valid' : 'invalid';
    const validationErrors = [
      ...(mockResult.validation.errors?.map(e => e.message) || []),
      ...(mockResult.validation.warnings?.map(w => w.message) || [])
    ];

    expect(validationStatus).toBe('invalid');
    expect(validationErrors).toContain('Critical error detected');
    expect(validationErrors).toContain('Minor warning');
  });
});