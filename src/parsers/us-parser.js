/**
 * US Invoice Parser
 *
 * Specialized parser for Amazon US (amazon.com) invoices
 * Handles US currency, date formats, and US-specific patterns
 */

const BaseParser = require('./base-parser');
const DateNormalizer = require('../utils/date-normalizer');

class USParser extends BaseParser {
  constructor() {
    super('US', 'US');
  }

  /**
   * Main extraction method for US invoices
   * @param {string} text - Preprocessed US invoice text
   * @param {Object} options - Extraction options
   * @returns {Object} - Extracted invoice data
   */
  extract(text, options = {}) {
    console.log('🇺🇸 Using US Parser');

    const items = this.extractItems(text);
    const subtotal = this.extractSubtotal(text) || this.calculateSubtotalFromItems(items);

    const rawInvoice = {
      orderNumber: this.extractOrderNumber(text),
      orderDate: this.extractOrderDate(text),
      items: items,
      subtotal: subtotal,
      shipping: this.extractShipping(text),
      tax: this.extractTax(text),
      discount: this.extractDiscount(text),
      total: this.extractTotal(text),
      vendor: 'Amazon',
      format: 'amazon.com',
      subtype: null,
      currency: 'USD'
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
      console.warn('US invoice validation warning:', error.details[0].message);
    }

    // Perform data validation
    const validationResult = this.validateInvoiceData(value);
    value.validation = validationResult;

    return value;
  }

  /**
   * Extract order number from US invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order number or null
   */
  extractOrderNumber(text) {
    if (!text || typeof text !== 'string') return null;

    // US order number patterns
    const orderPatterns = [
      /Order\s*Number[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /Order\s*#\s*(\d{3}-\d{7}-\d{7})/i,
      /Order[:\s]*(\d{3}-\d{7}-\d{7})/i,
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
   * Extract order date from US invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order date or null
   */
  extractOrderDate(text) {
    if (!text || typeof text !== 'string') return null;

    // US date patterns
    const datePatterns = [
      /Order\s+Placed[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      /Order\s+Date[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      /Date[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      // MM/DD/YYYY format
      /Order\s+Placed[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /Order\s+Date[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /Date[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
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
   * Extract items from US invoices
   * @param {string} text - Preprocessed text
   * @returns {Array} - Array of extracted items
   */
  extractItems(text) {
    const items = [];

    // US format: "X of: Description" followed by price
    // Pattern: /(\d+)\s+of:\s*([^$]+?)\s*\$(\d+\.?\d*)/g
    const itemRegex = /(\d+)\s+of:\s*([^$]+?)\s*\$(\d+\.?\d*)/g;

    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      const quantity = parseInt(match[1]);
      const description = match[2].trim();
      const unitPrice = parseFloat(match[3]);

      items.push({
        description,
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
        currency: 'USD',
        asin: null // US invoices don't include ASIN
      });
    }

    return items;
  }

  /**
   * Extract subtotal from US invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Subtotal or null
   */
  extractSubtotal(text) {
    if (!text || typeof text !== 'string') return null;

    const subtotalPatterns = [
      /Subtotal[:\s]*\$?([\d,]+\.?\d*)/i,
      /Sub-Total[:\s]*\$?([\d,]+\.?\d*)/i,
      /Item\(?s?\)? Subtotal[:\s]*\$?([\d,]+\.?\d*)/i,
    ];

    for (const pattern of subtotalPatterns) {
      const match = text.match(pattern);
      if (match) {
        return '$' + match[1];
      }
    }

    return null;
  }

  /**
   * Extract shipping from US invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Shipping cost or null
   */
  extractShipping(text) {
    if (!text || typeof text !== 'string') return null;

    const shippingPatterns = [
      /Shipping\s*&?\s*Handling[:\s]*\$?([\d,]+\.?\d*)/i,
      /Shipping[:\s]*\$?([\d,]+\.?\d*)/i,
      /Delivery[:\s]*\$?([\d,]+\.?\d*)/i,
    ];

    for (const pattern of shippingPatterns) {
      const match = text.match(pattern);
      if (match) {
        return '$' + match[1];
      }
    }

    return null;
  }

  /**
   * Extract tax from US invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Tax amount or null
   */
  extractTax(text) {
    if (!text || typeof text !== 'string') return null;

    const taxPatterns = [
      /Estimated\s+Tax[:\s]*\$?([\d,]+\.?\d*)/i,
      /Sales\s+Tax[:\s]*\$?([\d,]+\.?\d*)/i,
      /VAT[:\s]*\$?([\d,]+\.?\d*)/i,
      /Tax[:\s]*\$?([\d,]+\.?\d*)/i,  // Generic pattern last
    ];

    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match) {
        return '$' + match[1];
      }
    }

    return null;
  }

  /**
   * Extract discount from US invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Discount amount or null
   */
  extractDiscount(text) {
    if (!text || typeof text !== 'string') return null;

    const discountPatterns = [
      /Discount[:\s]*-?\$?(\d+\.?\d*)/i,
      /Promotion[:\s]*-?\$?(\d+\.?\d*)/i,
    ];

    for (const pattern of discountPatterns) {
      const match = text.match(pattern);
      if (match) {
        return '-$' + match[1];
      }
    }

    return null;
  }

  /**
   * Extract total from US invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Total amount or null
   */
  extractTotal(text) {
    if (!text || typeof text !== 'string') return null;

    const totalPatterns = [
      /Total[:\s]*\$?([\d,]+\.?\d*)/i,
      /Grand\s+Total[:\s]*\$?([\d,]+\.?\d*)/i,
      /Amount\s+Due[:\s]*\$?([\d,]+\.?\d*)/i,
      /Order\s+Total[:\s]*\$?([\d,]+\.?\d*)/i,
    ];

    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        return '$' + match[1];
      }
    }

    return null;
  }
}

module.exports = USParser;