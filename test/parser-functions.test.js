const AmazonInvoiceParser = require('../index');

// Mock data for different scenarios
const mockData = {
  english: {
    text: `
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
    `.trim(),
    expected: {
      orderNumber: '123-4567890-1234567',
      orderDate: 'December 15, 2023',
      items: [
        { description: '1 x Kindle Paperwhite $129.99', price: '$129.99' },
        { description: '1 x Kindle Cover $29.99', price: '$29.99' }
      ],
      subtotal: '$159.98',
      shipping: '$0.00',
      tax: '$12.80',
      total: '$172.78'
    }
  },

  german: {
    text: `
Amazon.de Bestellung
Bestellnr. 304-1234567-8901234
Bestelldatum: 15. Dezember 2023

Artikel:
Priorin Kapseln | Haarausfall bei Frauen | volleres und kräftigeres Haar |
nährstoffreich: Hirseextrakt, Vitamin B5 und Cystin | 1 x 120 Stück

Zwischensumme: €159,98
Versand: €0,00
MwSt: €12,80
Gesamtbetrag: €172,78

Zahlungsmethode: Kreditkarte ****5678
    `.trim(),
    expected: {
      orderNumber: '304-1234567-8901234',
      orderDate: '15 Dezember 2023',
      items: [
        { description: 'Priorin Kapseln | Haarausfall bei Frauen | volleres und kräftigeres Haar |', price: '537,37 €' },
        { description: 'nährstoffreich: Hirseextrakt, Vitamin B5 und Cystin | 1 x 120 Stück', price: '537,37 €' }
      ],
      subtotal: '€159,98',
      shipping: '€0,00',
      tax: '€12,80',
      total: '€172,78'
    }
  },

  french: {
    text: `
Amazon.fr Commande
Numéro de commande: 405-6789012-3456789
Date de commande: 15 décembre 2023

Articles:
1 x Kindle Paperwhite 129,99 €
1 x Kindle Cover 29,99 €

Sous-total: 159,98 €
Livraison: 0,00 €
TVA: 12,80 €
Total TTC: 172,78 €

Mode de paiement: Carte ****5678
    `.trim(),
    expected: {
      orderNumber: '405-6789012-3456789',
      orderDate: '15 décembre 2023',
      items: [
        { description: '1 x Kindle Paperwhite 129,99 €', price: '129,99 €' },
        { description: '1 x Kindle Cover 29,99 €', price: '29,99 €' }
      ],
      subtotal: '159,98 €',
      shipping: '0,00 €',
      tax: '12,80 €',
      total: '172,78 €'
    }
  }
};

describe('AmazonInvoiceParser - Core Parsing Functions', () => {
  let parser;

  beforeEach(() => {
    parser = new AmazonInvoiceParser();
  });

  describe('extractOrderNumber', () => {
    test('should extract English order number', () => {
      const result = parser.extractOrderNumber(mockData.english.text);
      expect(result).toBe('123-4567890-1234567');
    });

    test('should extract German order number', () => {
      const result = parser.extractOrderNumber(mockData.german.text);
      expect(result).toBe('304-1234567-8901234');
    });

    test('should extract French order number', () => {
      const result = parser.extractOrderNumber(mockData.french.text);
      expect(result).toBe('405-6789012-3456789');
    });

    test('should return null for text without order number', () => {
      const result = parser.extractOrderNumber('No order number here');
      expect(result).toBeNull();
    });

    test('should handle various order number formats', () => {
      const testCases = [
        { text: 'Order #111-2223334-5556667', expected: '111-2223334-5556667' },
        { text: 'Bestellnr. 999-8887776-5554443', expected: '999-8887776-5554443' },
        { text: 'Numéro de commande: 777-6665554-3332221', expected: '777-6665554-3332221' }
      ];

      testCases.forEach(({ text, expected }) => {
        const result = parser.extractOrderNumber(text);
        expect(result).toBe(expected);
      });
    });
  });

  describe('extractOrderDate', () => {
    test('should extract English order date', () => {
      const result = parser.extractOrderDate(mockData.english.text);
      expect(result).toBe('December 15, 2023');
    });

    test('should extract German order date', () => {
      const result = parser.extractOrderDate(mockData.german.text);
      expect(result).toBe('15 Dezember 2023');
    });

    test('should extract French order date', () => {
      const result = parser.extractOrderDate(mockData.french.text);
      expect(result).toBe('15 décembre 2023');
    });

    test('should handle German DD.MM.YYYY format', () => {
      const text = 'Date de commande30.11.2025';
      const result = parser.extractOrderDate(text);
      expect(result).toBe('30.11.2025');
    });

    test('should return null for text without date', () => {
      const result = parser.extractOrderDate('No date here');
      expect(result).toBeNull();
    });
  });

  describe('extractItems', () => {
    test('should extract English items', () => {
      const result = parser.extractItems(mockData.english.text);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('price', '$129.99');
    });

    test('should extract German items', () => {
      // Create text with German item patterns
      const germanText = `
Artikel:
Priorin Kapseln | Haarausfall bei Frauen | 537,37 €
nährstoffreich: Hirseextrakt | 537,37 €
      `.trim();

      const result = parser.extractItems(germanText);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should extract French items', () => {
      const result = parser.extractItems(mockData.french.text);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('price', '129,99 €');
    });

    test('should handle empty text', () => {
      const result = parser.extractItems('');
      expect(result).toEqual([]);
    });

    test('should return items when found', () => {
      const textWithItems = `
Items Ordered:
1 x Kindle Paperwhite $129.99
1 x Kindle Cover $29.99
      `.trim();

      const result = parser.extractItems(textWithItems);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('price');
    });
  });

  describe('extractSubtotal', () => {
    test('should extract English subtotal', () => {
      const result = parser.extractSubtotal(mockData.english.text);
      expect(result).toBe('$159.98');
    });

    test('should extract German subtotal', () => {
      const result = parser.extractSubtotal(mockData.german.text);
      expect(result).toBe('€159,98');
    });

    test('should extract French subtotal', () => {
      const result = parser.extractSubtotal(mockData.french.text);
      expect(result).toBe('159,98 €');
    });

    test('should return null when subtotal not found', () => {
      const result = parser.extractSubtotal('No subtotal here');
      expect(result).toBeNull();
    });
  });

  describe('extractShipping', () => {
    test('should extract English shipping', () => {
      const result = parser.extractShipping(mockData.english.text);
      expect(result).toBe('$0.00');
    });

    test('should extract German shipping', () => {
      const result = parser.extractShipping(mockData.german.text);
      expect(result).toBe('€0,00');
    });

    test('should extract French shipping', () => {
      const result = parser.extractShipping(mockData.french.text);
      expect(result).toBe('0,00 €');
    });

    test('should return null when shipping not found', () => {
      const result = parser.extractShipping('No shipping info');
      expect(result).toBeNull();
    });
  });

  describe('extractTax', () => {
    test('should extract English tax', () => {
      const result = parser.extractTax(mockData.english.text);
      expect(result).toBe('$12.80');
    });

    test('should extract German tax', () => {
      const result = parser.extractTax(mockData.german.text);
      expect(result).toBe('€12,80');
    });

    test('should extract French tax', () => {
      const result = parser.extractTax(mockData.french.text);
      expect(result).toBe('12,80 €');
    });

    test('should return null when tax not found', () => {
      const result = parser.extractTax('No tax information');
      expect(result).toBeNull();
    });
  });

  describe('extractTotal', () => {
    test('should extract English total', () => {
      const result = parser.extractTotal(mockData.english.text);
      expect(result).toBe('$172.78');
    });

    test('should extract German total', () => {
      const result = parser.extractTotal(mockData.german.text);
      expect(result).toBe('€172,78');
    });

    test('should extract French total', () => {
      const result = parser.extractTotal(mockData.french.text);
      expect(result).toBe('172,78 €');
    });

    test('should return null when total not found', () => {
      const result = parser.extractTotal('No total here');
      expect(result).toBeNull();
    });

    test('should handle various total formats', () => {
      const testCases = [
        { text: 'Grand Total: $100.00', expected: '$100.00' },
        { text: 'Total: €50,25', expected: '€50,25' },
        { text: 'Gesamtbetrag: CHF 75.50', expected: 'CHF 75.50' },
        { text: 'Total TTC: 200,00 €', expected: '200,00 €' }
      ];

      testCases.forEach(({ text, expected }) => {
        const result = parser.extractTotal(text);
        expect(result).toBe(expected);
      });
    });
  });
});