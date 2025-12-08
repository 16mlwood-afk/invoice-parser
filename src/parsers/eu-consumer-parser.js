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
   * Extract items from EU consumer invoices (table-based format)
   * @param {string} text - Preprocessed text
   * @returns {Array} - Array of extracted items
   */
  extractConsumerItems(text) {
    const items = [];
    const asinRegex = /ASIN:\s*([A-Z0-9]{10})/g;

    for (const match of text.matchAll(asinRegex)) {
      const asin = match[1];
      const asinIndex = match.index;

      // Look BACKWARD for description (table format)
      const textBefore = text.substring(
        Math.max(0, asinIndex - 600),
        asinIndex
      );

      // Extract description from the line immediately before ASIN
      const linesBefore = textBefore.split('\n');
      let description = '';
      for (let i = linesBefore.length - 1; i >= 0; i--) {
        const line = linesBefore[i].trim();
        if (line && !line.includes('ASIN:') && line.length > 10) {
          description = line;
          break;
        }
      }

      // Look FORWARD for pricing data (table format)
      const textAfter = text.substring(asinIndex, asinIndex + 300);

      // Parse the table structure more intelligently
      // EU Consumer format: Description | ASIN | UnitPriceHT € | Tax% | UnitPriceTTC € | TotalTTC €
      const lines = textAfter.split('\n').slice(1, 6); // Next 5 lines after ASIN

      // Look for the pricing pattern in the lines
      let unitPrice = null;
      let totalPrice = null;
      let taxRate = null;

      // Find the line with pricing data (should be the first line with € amounts)
      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip lines that are just numbers/symbols or tax percentages
        if (/^\d+\s*%?$/.test(trimmedLine) || trimmedLine.length < 3) {
          if (/^\d+\s*%?$/.test(trimmedLine)) {
            taxRate = parseInt(trimmedLine);
          }
          continue;
        }

        // Look for euro amounts in this line
        const euroMatches = [...trimmedLine.matchAll(/(\d+,\d{2})\s*€/g)];

        if (euroMatches.length > 0) {
          const amounts = euroMatches.map(match => parseFloat(match[1].replace(',', '.')));

          // If we have amounts and haven't set prices yet
          if (!unitPrice && !totalPrice) {
            if (amounts.length === 1) {
              // Single amount - in consumer invoices, this is usually the total price
              totalPrice = amounts[0];
              unitPrice = amounts[0]; // For consumer invoices, unit price = total price
            } else if (amounts.length >= 2) {
              // Multiple amounts - typically unit price HT, unit price TTC, total TTC
              // In consumer invoices, the last amount is usually the total
              unitPrice = amounts[0]; // First amount is usually unit price HT
              totalPrice = amounts[amounts.length - 1]; // Last amount is total TTC
            }
          }
          break; // Found pricing data, stop looking
        }
      }

      // Only create item if we have pricing data
      if (unitPrice && totalPrice) {
        const quantity = 1; // Consumer invoices typically have quantity 1

        items.push({
          asin,
          description: description.trim(),
          quantity,
          unitPrice,
          totalPrice,
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