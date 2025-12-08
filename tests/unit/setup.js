// Jest setup file for Amazon Invoice Parser tests
// Configure test environment and global utilities

// Set test environment
process.env.NODE_ENV = 'test';

// Global test utilities
global.testUtils = {
  // Helper to create mock invoice data with various currencies and formats
  createMockInvoice: (overrides = {}) => {
    const baseInvoice = {
    orderNumber: '123-4567890-1234567',
    orderDate: '15 December 2023',
    items: [
      { description: 'Test Item 1', price: '$10.00' },
      { description: 'Test Item 2', price: '$20.00' }
    ],
    subtotal: '$30.00',
    shipping: '$5.00',
    tax: '$3.00',
    total: '$38.00',
      vendor: 'Amazon'
    };

    return { ...baseInvoice, ...overrides };
  },

  // Create mock invoice with German format
  createMockGermanInvoice: (overrides = {}) => ({
    orderNumber: '304-1234567-8901234',
    orderDate: '15 Dezember 2023',
    items: [
      { description: 'Test Artikel 1', price: '€10,00' },
      { description: 'Test Artikel 2', price: '€20,00' }
    ],
    subtotal: '€30,00',
    shipping: '€5,00',
    tax: '€3,00',
    total: '€38,00',
    vendor: 'Amazon',
    ...overrides
  }),

  // Create mock invoice with French format
  createMockFrenchInvoice: (overrides = {}) => ({
    orderNumber: '405-6789012-3456789',
    orderDate: '15 décembre 2023',
    items: [
      { description: 'Article Test 1', price: '10,00 €' },
      { description: 'Article Test 2', price: '20,00 €' }
    ],
    subtotal: '30,00 €',
    shipping: '5,00 €',
    tax: '3,00 €',
    total: '38,00 €',
    vendor: 'Amazon',
    ...overrides
  }),

  // Create mock invoice with GBP
  createMockGBPInvoice: (overrides = {}) => ({
    orderNumber: '789-0123456-7890123',
    orderDate: '15 December 2023',
    items: [
      { description: 'Test Item 1', price: '£10.00' },
      { description: 'Test Item 2', price: '£20.00' }
    ],
    subtotal: '£30.00',
    shipping: '£5.00',
    tax: '£3.00',
    total: '£38.00',
    vendor: 'Amazon',
    ...overrides
  }),

  // Create mock invoice with various edge cases
  createMockEdgeCaseInvoice: (type = 'empty') => {
    const edgeCases = {
      empty: {
        orderNumber: null,
        orderDate: null,
        items: [],
        subtotal: null,
        shipping: null,
        tax: null,
        total: null,
        vendor: 'Amazon'
      },
      malformed: {
        orderNumber: 'invalid-format',
        orderDate: 'not-a-date',
        items: [{ description: '', price: 'invalid' }],
        subtotal: 'not-a-price',
        shipping: '$0.00',
        tax: '$0.00',
        total: '$0.00',
        vendor: 'Amazon'
      },
      largeNumbers: {
        orderNumber: '123-4567890-1234567',
        orderDate: '15 December 2023',
        items: [
          { description: 'Expensive Item', price: '$99999.99' },
          { description: 'Another Expensive Item', price: '$99999.99' }
        ],
        subtotal: '$199999.98',
        shipping: '$0.00',
        tax: '$0.00',
        total: '$199999.98',
        vendor: 'Amazon'
      }
    };

    return edgeCases[type] || edgeCases.empty;
  },

  // Helper to create mock PDF text with various formats
  createMockPDFText: (options = {}) => {
    const { language = 'english', currency = 'USD', items = 2, format = 'standard' } = options;

    const templates = {
      english: {
        header: 'Amazon.com Order Confirmation',
        orderPrefix: 'Order #',
        datePrefix: 'Order Placed: ',
        itemsHeader: 'Items Ordered:',
        subtotalLabel: 'Subtotal: ',
        shippingLabel: 'Shipping: ',
        taxLabel: 'Tax: ',
        totalLabel: 'Grand Total: ',
        paymentLabel: 'Payment Method: Visa ****1234'
      },
      german: {
        header: 'Amazon.de Bestellung',
        orderPrefix: 'Bestellnr. ',
        datePrefix: 'Bestelldatum: ',
        itemsHeader: 'Artikel:',
        subtotalLabel: 'Zwischensumme: ',
        shippingLabel: 'Versand: ',
        taxLabel: 'MwSt: ',
        totalLabel: 'Gesamtbetrag: ',
        paymentLabel: 'Zahlungsmethode: Kreditkarte ****5678'
      },
      french: {
        header: 'Amazon.fr Commande',
        orderPrefix: 'Numéro de commande: ',
        datePrefix: 'Date de commande: ',
        itemsHeader: 'Articles:',
        subtotalLabel: 'Sous-total: ',
        shippingLabel: 'Livraison: ',
        taxLabel: 'TVA: ',
        totalLabel: 'Total TTC: ',
        paymentLabel: 'Mode de paiement: Carte ****5678'
      }
    };

    const template = templates[language] || templates.english;
    const currencySymbols = { USD: '$', EUR: '€', GBP: '£' };
    const symbol = currencySymbols[currency] || '$';

    const sampleItems = [];
    let totalPrice = 0;
    for (let i = 1; i <= items; i++) {
      const price = (i * 10);
      totalPrice += price;
      const formattedPrice = currency === 'EUR' && language === 'german' ? `${price.toFixed(2).replace('.', ',')}€` :
                            currency === 'EUR' && language === 'french' ? `${price.toFixed(2).replace('.', ',')} €` :
                            `${symbol}${price.toFixed(2)}`;
      sampleItems.push(`${i} x Test Item ${i} ${formattedPrice}`);
    }

    const subtotal = totalPrice.toFixed(2);
    const shipping = 5.00;
    const tax = 3.00;
    const total = (totalPrice + shipping + tax).toFixed(2);

    const formatPrice = (amount) => {
      const amountStr = typeof amount === 'number' ? amount.toFixed(2) : amount.toString();
      if (currency === 'EUR' && language === 'german') return `${amountStr.replace('.', ',')}€`;
      if (currency === 'EUR' && language === 'french') return `${amountStr.replace('.', ',')} €`;
      return `${symbol}${amountStr}`;
    };

    return `
${template.header}
${template.orderPrefix}123-4567890-1234567
${template.datePrefix}December 15, 2023

${template.itemsHeader}
${sampleItems.join('\n')}

${template.subtotalLabel}${formatPrice(subtotal)}
${template.shippingLabel}${formatPrice(shipping)}
${template.taxLabel}${formatPrice(tax)}
${template.totalLabel}${formatPrice(total)}

${template.paymentLabel}
    `.trim();
  },

  // Helper to mock fs operations for testing
  mockFileSystem: () => {
    const fs = require('fs');
    const originalExistsSync = fs.existsSync;
    const originalReadFileSync = fs.readFileSync;
    const originalWriteFileSync = fs.writeFileSync;

    return {
      restore: () => {
        fs.existsSync = originalExistsSync;
        fs.readFileSync = originalReadFileSync;
        fs.writeFileSync = originalWriteFileSync;
      }
    };
  }
};

// Configure console methods for cleaner test output
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.warn = (...args) => {
  if (process.env.JEST_VERBOSE) {
    originalConsoleWarn(...args);
  }
};

console.error = (...args) => {
  if (process.env.JEST_VERBOSE) {
    originalConsoleError(...args);
  }
};

// Clean up after all tests
afterAll(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});