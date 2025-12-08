/**
 * English Invoice Parser
 *
 * Specialized parser for English (EN) Amazon invoices
 * Handles Order Number, Tax/VAT patterns, and English date formats
 */

const BaseParser = require('./base-parser');

class EnglishParser extends BaseParser {
  constructor() {
    super('English', 'EN');
  }

  /**
   * Main extraction method for English invoices
   * @param {string} text - Preprocessed English invoice text
   * @returns {Object} - Extracted invoice data
   */
  extract(text) {
    const items = this.extractItems(text);
    const subtotal = this.extractSubtotal(text) || this.calculateSubtotalFromItems(items);

    const rawInvoice = {
      orderNumber: this.extractOrderNumber(text),
      orderDate: this.extractOrderDate(text),
      items: items,
      subtotal: subtotal,
      shipping: this.extractShipping(text),
      tax: this.extractTax(text),
      total: this.extractTotal(text),
      vendor: 'Amazon'
    };

    // Validate against schema
    const { error, value } = this.invoiceSchema.validate(rawInvoice, {
      stripUnknown: true,
      convert: true
    });

    if (error) {
      console.warn('English invoice validation warning:', error.details[0].message);
    }

    // Perform data validation
    const validationResult = this.validateInvoiceData(value);
    value.validation = validationResult;

    return value;
  }

  /**
   * Extract order number from English invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order number or null
   */
  extractOrderNumber(text) {
    if (!text || typeof text !== 'string') return null;

    // English order number patterns
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
   * Extract order date from English invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order date or null
   */
  extractOrderDate(text) {
    if (!text || typeof text !== 'string') return null;

    // English date patterns
    const datePatterns = [
      /Order\s+Placed[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      /Order\s+Date[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      /Date[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      // DD/MM/YYYY format (UK/Commonwealth)
      /(?:Order\s+Placed|Order\s+Date|Date)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      // MM/DD/YYYY format (US)
      /(?:Order\s+Placed|Order\s+Date|Date)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      // DD.MM.YYYY format (international)
      /(?:Order\s+Placed|Order\s+Date|Date)[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})/i,
      // DD-MM-YYYY format
      /(?:Order\s+Placed|Order\s+Date|Date)[:\s]*(\d{1,2}-\d{1,2}-\d{4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1];
        if (this.isValidDate(dateStr)) {
          return dateStr;
        }
      }
    }

    // Fallback to generic date extraction
    return this.extractGenericDate(text);
  }

  /**
   * Extract items from English invoices
   * @param {string} text - Preprocessed text
   * @returns {Array} - Array of item objects
   */
  extractItems(text) {
    if (!text || typeof text !== 'string') return [];

    const items = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // English item patterns
      // Pattern: quantity x description $price
      const englishItemPattern = /(\d+)\s*x\s+(.+?)\s+[$]([\d,.]+)/i;
      const match = line.match(englishItemPattern);
      if (match) {
        const [, quantity, description, price] = match;
        items.push({
          description: `${quantity} x ${description.trim()}`,
          price: `$${price}`
        });
        continue;
      }

      // Alternative: description | $price
      const altPattern = /(.+?)\s*\|\s*[$]([\d,.]+)/i;
      const altMatch = line.match(altPattern);
      if (altMatch) {
        const [, description, price] = altMatch;
        items.push({
          description: description.trim(),
          price: `$${price}`
        });
        continue;
      }

      // Pattern: description $price
      const simplePattern = /(.+?)\s+[$]([\d,.]+)/i;
      const simpleMatch = line.match(simplePattern);
      if (simpleMatch) {
        const [, description, price] = simpleMatch;
        // Avoid matching totals, subtotals, etc.
        const desc = description.trim();
        if (!/(subtotal|shipping|tax|total)/i.test(desc) && desc.length > 3) {
          items.push({
            description: desc,
            price: `$${price}`
          });
        }
        continue;
      }
    }

    return items;
  }

  /**
   * Extract subtotal from English invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Subtotal amount or null
   */
  extractSubtotal(text) {
    if (!text || typeof text !== 'string') return null;

    // English subtotal patterns
    const subtotalPatterns = [
      /Subtotal[:\s]*[$]([\d,.]+)/i,
      /Subtotal[:\s]*([\d,.]+)\s*[$]/i,
      /Sub-total[:\s]*[$]([\d,.]+)/i,
      /Sub-total[:\s]*([\d,.]+)\s*[$]/i,
    ];

    for (const pattern of subtotalPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[2] ? `${match[1]} ${match[2]}` : `$${match[1]}`;
      }
    }
    return null;
  }

  /**
   * Extract shipping cost from English invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Shipping amount or null
   */
  extractShipping(text) {
    if (!text || typeof text !== 'string') return null;

    const shippingPatterns = [
      /Shipping[:\s]*[$]([\d,.]+)/i,
      /Shipping[:\s]*([\d,.]+)\s*[$]/i,
      /Delivery[:\s]*[$]([\d,.]+)/i,
      /Delivery[:\s]*([\d,.]+)\s*[$]/i,
    ];

    for (const pattern of shippingPatterns) {
      const match = text.match(pattern);
      if (match) return match[2] ? `${match[1]} ${match[2]}` : `$${match[1]}`;
    }
    return null;
  }

  /**
   * Extract tax from English invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Tax amount or null
   */
  extractTax(text) {
    if (!text || typeof text !== 'string') return null;

    // English tax patterns (Tax, VAT, GST)
    const taxPatterns = [
      /Tax[:\s]*[$]([\d,.]+)/i,
      /Tax[:\s]*([\d,.]+)\s*[$]/i,
      /VAT[:\s]*[$]([\d,.]+)/i,
      /VAT[:\s]*([\d,.]+)\s*[$]/i,
      /GST[:\s]*[$]([\d,.]+)/i,
      /GST[:\s]*([\d,.]+)\s*[$]/i,
    ];

    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match) return match[2] ? `${match[1]} ${match[2]}` : `$${match[1]}`;
    }
    return null;
  }

  /**
   * Extract total from English invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Total amount or null
   */
  extractTotal(text) {
    if (!text || typeof text !== 'string') return null;

    const totalPatterns = [
      /Grand\s+Total[:\s]*[$]([\d,.]+)/i,
      /Grand\s+Total[:\s]*([\d,.]+)\s*[$]/i,
      /Total[:\s]*[$]([\d,.]+)/i,
      /Total[:\s]*([\d,.]+)\s*[$]/i,
      /Order\s+Total[:\s]*[$]([\d,.]+)/i,
      /Order\s+Total[:\s]*([\d,.]+)\s*[$]/i,
    ];

    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) return match[2] ? `${match[1]} ${match[2]}` : `$${match[1]}`;
    }
    return null;
  }
}

module.exports = EnglishParser;