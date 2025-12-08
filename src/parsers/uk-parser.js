/**
 * UK Invoice Parser
 *
 * Specialized parser for UK (GB) Amazon invoices
 * Handles British English patterns and GBP currency (£)
 */

const BaseParser = require('./base-parser');

class UKParser extends BaseParser {
  constructor() {
    super('British English', 'GB');
  }

  /**
   * Main extraction method for UK invoices
   * @param {string} text - Preprocessed UK invoice text
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
      console.warn('UK invoice validation warning:', error.details[0].message);
    }

    // Perform data validation
    const validationResult = this.validateInvoiceData(value);
    value.validation = validationResult;

    return value;
  }

  /**
   * Extract order number from UK invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order number or null
   */
  extractOrderNumber(text) {
    if (!text || typeof text !== 'string') return null;

    // UK order number patterns
    const orderPatterns = [
      /Order\s+Number[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /Order\s+No[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /Order\s*(?<![-\d])(\d{3}-\d{7}-\d{7})(?![-\d])/i,
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
   * Extract order date from UK invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order date or null
   */
  extractOrderDate(text) {
    if (!text || typeof text !== 'string') return null;

    // UK date patterns (DD/MM/YYYY is common in UK)
    const datePatterns = [
      /Order\s+Placed[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      /Order\s+Date[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      /Date[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      // DD/MM/YYYY format (common in UK)
      /(?:Order\s+Placed|Order\s+Date|Date)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      // DD.MM.YYYY format
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
   * Extract items from UK invoices
   * @param {string} text - Preprocessed text
   * @returns {Array} - Array of item objects
   */
  extractItems(text) {
    if (!text || typeof text !== 'string') return [];

    const items = [];
    const lines = text.split('\n');

    // UK item patterns (GBP currency)
    const itemPatterns = [
      /^(\d+)\s*x\s+(.+?)\s+([£]\s*\d{1,3}(?:,\d{3})*\.\d{2})/i,
      /^(\d+)\s+×\s+(.+?)\s+([£]\s*\d{1,3}(?:,\d{3})*\.\d{2})/i,
      /^(.+?)\s+([£]\s*\d{1,3}(?:,\d{3})*\.\d{2})/i,
    ];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      for (const pattern of itemPatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          let description = match[2] || match[1];
          const price = match[3];

          // Clean up description
          description = description.replace(/\s+/g, ' ').trim();

          // Skip if this looks like a total or subtotal line
          if (this.isTotalLine(description)) continue;

          items.push({
            description: description,
            price: price
          });
          break;
        }
      }
    }

    return items;
  }

  /**
   * Extract subtotal from UK invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Subtotal amount or null
   */
  extractSubtotal(text) {
    if (!text || typeof text !== 'string') return null;

    // UK subtotal patterns
    const subtotalPatterns = [
      /Subtotal[:\s]*([£]\s*\d{1,3}(?:,\d{3})*\.\d{2})/i,
      /Sub-total[:\s]*([£]\s*\d{1,3}(?:,\d{3})*\.\d{2})/i,
    ];

    for (const pattern of subtotalPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract shipping cost from UK invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Shipping amount or null
   */
  extractShipping(text) {
    if (!text || typeof text !== 'string') return null;

    // UK shipping patterns
    const shippingPatterns = [
      /Shipping[:\s]*([£]\s*\d{1,3}(?:,\d{3})*\.\d{2})/i,
      /Delivery[:\s]*([£]\s*\d{1,3}(?:,\d{3})*\.\d{2})/i,
      /Postage[:\s]*([£]\s*\d{1,3}(?:,\d{3})*\.\d{2})/i,
    ];

    for (const pattern of shippingPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract tax from UK invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Tax amount or null
   */
  extractTax(text) {
    if (!text || typeof text !== 'string') return null;

    // UK tax patterns (VAT - Value Added Tax)
    const taxPatterns = [
      /VAT[:\s]*([£]\s*\d{1,3}(?:,\d{3})*\.\d{2})/i,
      /Tax[:\s]*([£]\s*\d{1,3}(?:,\d{3})*\.\d{2})/i,
      /VAT\s+Included[:\s]*([£]\s*\d{1,3}(?:,\d{3})*\.\d{2})/i,
    ];

    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract total from UK invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Total amount or null
   */
  extractTotal(text) {
    if (!text || typeof text !== 'string') return null;

    // UK total patterns
    const totalPatterns = [
      /Total[:\s]*([£]\s*\d{1,3}(?:,\d{3})*\.\d{2})/i,
      /Grand\s+Total[:\s]*([£]\s*\d{1,3}(?:,\d{3})*\.\d{2})/i,
      /Order\s+Total[:\s]*([£]\s*\d{1,3}(?:,\d{3})*\.\d{2})/i,
      /Amount\s+Due[:\s]*([£]\s*\d{1,3}(?:,\d{3})*\.\d{2})/i,
    ];

    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Check if a line contains total-related text
   * @param {string} text - Text to check
   * @returns {boolean} - True if this is a total line
   */
  isTotalLine(text) {
    const totalKeywords = [
      'total', 'subtotal', 'sub-total', 'shipping', 'delivery', 'postage',
      'vat', 'tax', 'grand total', 'order total', 'amount due'
    ];

    const lowerText = text.toLowerCase();
    return totalKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Calculate subtotal from items if not explicitly stated
   * @param {Array} items - Array of item objects
   * @returns {string|null} - Calculated subtotal or null
   */
  calculateSubtotalFromItems(items) {
    if (!items || items.length === 0) return null;

    let total = 0;
    for (const item of items) {
      if (item.price) {
        // Extract numeric value from price string (handle GBP format)
        const numericMatch = item.price.match(/[\d,]+(?:\.\d{2})?/);
        if (numericMatch) {
          const cleanPrice = numericMatch[0].replace(/,/g, '');
          const price = parseFloat(cleanPrice);
          if (!isNaN(price)) {
            total += price;
          }
        }
      }
    }

    if (total > 0) {
      return `£${total.toFixed(2)}`;
    }

    return null;
  }
}

module.exports = UKParser;