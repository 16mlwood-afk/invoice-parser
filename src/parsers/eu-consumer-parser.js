/**
 * EU Consumer Invoice Parser
 *
 * Specialized parser for Amazon EU consumer invoices
 * Handles line-based format where item data appears after ASIN
 */

const BaseParser = require('./base-parser');
const DateNormalizer = require('../utils/date-normalizer');

class EUConsumerParser extends BaseParser {
  constructor() {
    super('EU Consumer', 'EU-CONSUMER');
  }

  /**
   * Main extraction method for EU consumer invoices
   * @param {string} text - Preprocessed EU consumer invoice text
   * @param {Object} options - Extraction options
   * @returns {Object} - Extracted invoice data
   */
  extract(text, options = {}) {
    console.log('🛒 Using EU Consumer Parser');

    const items = this.extractConsumerItems(text);

    const rawInvoice = {
      orderNumber: this.extractOrderNumber(text),
      orderDate: this.extractOrderDate(text),
      items: items,
      subtotal: this.extractSubtotal(text) || this.calculateSubtotalFromItems(items),
      shipping: this.extractShipping(text),
      tax: this.extractTax(text),
      discount: this.extractDiscount(text),
      total: this.extractTotal(text),
      vendor: 'Amazon',
      format: 'amazon.eu',
      subtype: 'consumer',
      currency: 'EUR'
    };

    // Add format metadata from options if available
    if (options?.classification) {
      rawInvoice.formatClassification = options.classification;
    }

    // Validate against schema
    const { error, value } = this.invoiceSchema.validate(rawInvoice, {
      stripUnknown: true,
      convert: true
    });

    if (error) {
      console.warn('EU Consumer invoice validation warning:', error.details[0].message);
    }

    // Perform data validation
    const validationResult = this.validateInvoiceData(value);
    value.validation = validationResult;

    return value;
  }

  /**
   * Extract order number from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order number or null
   */
  extractOrderNumber(text) {
    if (!text || typeof text !== 'string') return null;

    // EU consumer order number patterns
    const orderPatterns = [
      /Bestellnummer[:\s]*([A-Z0-9]{3}-\d{7}-\d{7})/i,
      /Order\s*Number[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /Order\s*#\s*(\d{3}-\d{7}-\d{7})/i,
      // Fallback to standard format
      /(?<![-\d])(\d{3}-\d{7}-\d{7})(?![-\d])/,
    ];

    for (const pattern of orderPatterns) {
      const match = text.match(pattern);
      if (match) {
        const orderNum = match[1];
        // Validate format
        const segments = orderNum.split('-');
        if (segments.length === 3 &&
            segments[0].length === 3 && /^\d{3}$/.test(segments[0]) &&
            segments[1].length === 7 && /^\d{7}$/.test(segments[1]) &&
            segments[2].length === 7 && /^\d{7}$/.test(segments[2])) {
          return orderNum;
        }
      }
    }
    return null;
  }

  /**
   * Extract order date from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order date or null
   */
  extractOrderDate(text) {
    if (!text || typeof text !== 'string') return null;

    // EU consumer date patterns
    const datePatterns = [
      /Bestelldatum[:\s]*([\d.\/-]+)/i,
      /Order\s+Date[:\s]*([\d.\/-]+)/i,
      /Datum[:\s]*([\d.\/-]+)/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return DateNormalizer.normalize(match[1]);
      }
    }

    return null;
  }

  /**
   * Extract items from EU consumer invoices (line-based format)
   * Consumer invoices have data after ASIN on separate lines
   * @param {string} text - Preprocessed text
   * @returns {Array} - Array of extracted items
   */
  extractConsumerItems(text) {
    const items = [];
    const asinRegex = /ASIN:\s*([A-Z0-9]{10})/g;

    for (const match of text.matchAll(asinRegex)) {
      const asin = match[1];
      const asinIndex = match.index;

      // Look BACKWARD for description
      const textBefore = text.substring(
        Math.max(0, asinIndex - 300),
        asinIndex
      );
      const lines = textBefore.split('\n');
      const description = lines[lines.length - 2]?.trim() || '';

      // Look FORWARD - data comes after ASIN on new lines
      const textAfter = text.substring(asinIndex, asinIndex + 200);

      // Consumer pattern: separate lines
      // "ASIN: B08W23J183"
      // "1    155,45 €    0%    155,45 €    155,45 €"
      const dataMatch = textAfter.match(
        /\n\s*(\d+)\s+(\d+,\d{2})\s*€.*?(\d+,\d{2})\s*€\s*$/m
      );

      if (dataMatch) {
        items.push({
          asin,
          description,
          quantity: parseInt(dataMatch[1]),
          unitPrice: parseFloat(dataMatch[2].replace(',', '.')),
          totalPrice: parseFloat(dataMatch[3].replace(',', '.')),
          currency: 'EUR'
        });
      }
    }

    return items;
  }

  /**
   * Extract subtotal from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Subtotal or null
   */
  extractSubtotal(text) {
    if (!text || typeof text !== 'string') return null;

    const subtotalPatterns = [
      /Zwischensumme[:\s]*(\d+,\d{2})\s*€/i,
      /Subtotal[:\s]*(\d+,\d{2})\s*€/i,
      /Nettobetrag[:\s]*(\d+,\d{2})\s*€/i,
    ];

    for (const pattern of subtotalPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] + ' €';
      }
    }

    return null;
  }

  /**
   * Extract shipping from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Shipping cost or null
   */
  extractShipping(text) {
    if (!text || typeof text !== 'string') return null;

    const shippingPatterns = [
      /Versand[:\s]*(\d+,\d{2})\s*€/i,
      /Shipping[:\s]*(\d+,\d{2})\s*€/i,
      /Delivery[:\s]*(\d+,\d{2})\s*€/i,
    ];

    for (const pattern of shippingPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] + ' €';
      }
    }

    return null;
  }

  /**
   * Extract tax from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Tax amount or null
   */
  extractTax(text) {
    if (!text || typeof text !== 'string') return null;

    const taxPatterns = [
      /MwSt[:\s]*(\d+,\d{2})\s*€/i,
      /VAT[:\s]*(\d+,\d{2})\s*€/i,
      /Steuer[:\s]*(\d+,\d{2})\s*€/i,
    ];

    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] + ' €';
      }
    }

    return null;
  }

  /**
   * Extract discount from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Discount amount or null
   */
  extractDiscount(text) {
    if (!text || typeof text !== 'string') return null;

    const discountPatterns = [
      /Rabatt[:\s]*(-?\d+,\d{2})\s*€/i,
      /Discount[:\s]*(-?\d+,\d{2})\s*€/i,
    ];

    for (const pattern of discountPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] + ' €';
      }
    }

    return null;
  }

  /**
   * Extract total from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Total amount or null
   */
  extractTotal(text) {
    if (!text || typeof text !== 'string') return null;

    const totalPatterns = [
      /Gesamtbetrag[:\s]*(\d+,\d{2})\s*€/i,
      /Total[:\s]*(\d+,\d{2})\s*€/i,
      /Gesamt[:\s]*(\d+,\d{2})\s*€/i,
    ];

    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] + ' €';
      }
    }

    return null;
  }
}

module.exports = EUConsumerParser;