/**
 * Swiss Invoice Parser
 *
 * Specialized parser for Swiss (CH) Amazon invoices
 * Handles Swiss German patterns and CHF currency (CHF)
 */

const BaseParser = require('./base-parser');

class SwissParser extends BaseParser {
  constructor() {
    super('Swiss German', 'CH');
  }

  /**
   * Main extraction method for Swiss invoices
   * @param {string} text - Preprocessed Swiss invoice text
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
      console.warn('Swiss invoice validation warning:', error.details[0].message);
    }

    // Perform data validation
    const validationResult = this.validateInvoiceData(value);
    value.validation = validationResult;

    return value;
  }

  /**
   * Extract order number from Swiss invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order number or null
   */
  extractOrderNumber(text) {
    if (!text || typeof text !== 'string') return null;

    // Swiss order number patterns (German-based)
    const orderPatterns = [
      /Bestellnummer[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /Bestell-Nr[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /Bestellung\s*(?<![-\d])(\d{3}-\d{7}-\d{7})(?![-\d])/i,
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
   * Extract order date from Swiss invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order date or null
   */
  extractOrderDate(text) {
    if (!text || typeof text !== 'string') return null;

    // Swiss date patterns (German-based, DD.MM.YYYY common in Switzerland)
    const datePatterns = [
      /Bestelldatum[:\s]*(\d{1,2})\.?\s*([A-Za-zäöüß]+)\s+(\d{4})/i,
      /Bestelldatum[:\s]*(\d{1,2}\.\s*[A-Za-zäöüß]+\s+\d{4})/i,
      /Bestelldatum\s+(\d{1,2})\.\s*([A-Za-zäöüß]+)\s+(\d{4})/i,
      // DD.MM.YYYY format (common in Switzerland)
      /(?:Bestelldatum)[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})/i,
      // DD/MM/YYYY format
      /(?:Bestelldatum)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      // DD-MM-YYYY format
      /(?:Bestelldatum)[:\s]*(\d{1,2}-\d{1,2}-\d{4})/i,
      // DD.MM.YYYY format without label
      /\b(\d{1,2}\.\d{1,2}\.\d{4})\b/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        let dateStr = match[1];

        // Handle patterns with separate day/month/year
        if (match[2] && match[3]) {
          dateStr = `${match[1]} ${match[2]} ${match[3]}`;
        }

        // Remove leading dot for German/Swiss date formats
        if (dateStr.match(/^\d{1,2}\.\s+[A-Za-z]/)) {
          dateStr = dateStr.replace(/^\d{1,2}\.\s*/, '');
        }

        if (this.isValidDate(dateStr)) {
          return dateStr;
        }
      }
    }

    // Fallback to generic date extraction
    return this.extractGenericDate(text);
  }

  /**
   * Extract items from Swiss invoices
   * @param {string} text - Preprocessed text
   * @returns {Array} - Array of item objects
   */
  extractItems(text) {
    if (!text || typeof text !== 'string') return [];

    const items = [];
    const lines = text.split('\n');

    // Swiss item patterns (CHF currency)
    const itemPatterns = [
      /^(\d+)\s*x\s+(.+?)\s+(?:CHF\s*)(\d+[,.]\d{2})/i,
      /^(\d+)\s+×\s+(.+?)\s+(?:CHF\s*)(\d+[,.]\d{2})/i,
      /^(.+?)\s+(?:CHF\s*)(\d+[,.]\d{2})/i,
    ];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      for (const pattern of itemPatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          let description = match[2] || match[1];
          let price = match[3];

          // Ensure CHF currency is present
          if (!price.includes('CHF')) {
            price = 'CHF ' + price;
          }

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
   * Extract subtotal from Swiss invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Subtotal amount or null
   */
  extractSubtotal(text) {
    if (!text || typeof text !== 'string') return null;

    // Swiss subtotal patterns
    const subtotalPatterns = [
      /Zwischensumme[:\s]*(?:CHF\s*)(\d+[,.]\d{2})/i,
      /Subtotal[:\s]*(?:CHF\s*)(\d+[,.]\d{2})/i,
      /Zwischentotal[:\s]*(?:CHF\s*)(\d+[,.]\d{2})/i,
    ];

    for (const pattern of subtotalPatterns) {
      const match = text.match(pattern);
      if (match) {
        let amount = match[1];
        if (!amount.includes('CHF')) {
          amount = 'CHF ' + amount;
        }
        return amount;
      }
    }

    return null;
  }

  /**
   * Extract shipping cost from Swiss invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Shipping amount or null
   */
  extractShipping(text) {
    if (!text || typeof text !== 'string') return null;

    // Swiss shipping patterns
    const shippingPatterns = [
      /Versand[:\s]*(?:CHF\s*)(\d+[,.]\d{2})/i,
      /Lieferung[:\s]*(?:CHF\s*)(\d+[,.]\d{2})/i,
      /Porto[:\s]*(?:CHF\s*)(\d+[,.]\d{2})/i,
    ];

    for (const pattern of shippingPatterns) {
      const match = text.match(pattern);
      if (match) {
        let amount = match[1];
        if (!amount.includes('CHF')) {
          amount = 'CHF ' + amount;
        }
        return amount;
      }
    }

    return null;
  }

  /**
   * Extract tax from Swiss invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Tax amount or null
   */
  extractTax(text) {
    if (!text || typeof text !== 'string') return null;

    // Swiss tax patterns (MWST - Mehrwertsteuer)
    const taxPatterns = [
      /MWST[:\s]*(?:CHF\s*)(\d+[,.]\d{2})/i,
      /Mehrwertsteuer[:\s]*(?:CHF\s*)(\d+[,.]\d{2})/i,
      /TVA[:\s]*(?:CHF\s*)(\d+[,.]\d{2})/i,
      /Steuer[:\s]*(?:CHF\s*)(\d+[,.]\d{2})/i,
    ];

    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match) {
        let amount = match[1];
        if (!amount.includes('CHF')) {
          amount = 'CHF ' + amount;
        }
        return amount;
      }
    }

    return null;
  }

  /**
   * Extract total from Swiss invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Total amount or null
   */
  extractTotal(text) {
    if (!text || typeof text !== 'string') return null;

    // Swiss total patterns
    const totalPatterns = [
      /Gesamtbetrag[:\s]*(?:CHF\s*)(\d+[,.]\d{2})/i,
      /Total[:\s]*(?:CHF\s*)(\d+[,.]\d{2})/i,
      /Gesamt[:\s]*(?:CHF\s*)(\d+[,.]\d{2})/i,
      /Betrag[:\s]*(?:CHF\s*)(\d+[,.]\d{2})/i,
    ];

    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        let amount = match[1];
        if (!amount.includes('CHF')) {
          amount = 'CHF ' + amount;
        }
        return amount;
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
      'gesamtbetrag', 'total', 'gesamt', 'zwischensumme', 'subtotal',
      'versand', 'lieferung', 'porto', 'mwst', 'mehrwertsteuer', 'tva', 'steuer', 'betrag'
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
        // Extract numeric value from price string (handle CHF format)
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
      return `CHF ${total.toFixed(2)}`;
    }

    return null;
  }
}

module.exports = SwissParser;