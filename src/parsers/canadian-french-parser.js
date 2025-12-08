/**
 * Canadian French Invoice Parser
 *
 * Specialized parser for Canadian French (CA-FR) Amazon invoices
 * Handles Quebec-specific patterns, Canadian French vocabulary, and CAD currency ($)
 */

const BaseParser = require('./base-parser');

class CanadianFrenchParser extends BaseParser {
  constructor() {
    super('Canadian French', 'CA-FR');
  }

  /**
   * Main extraction method for Canadian French invoices
   * @param {string} text - Preprocessed Canadian French invoice text
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
      console.warn('Canadian French invoice validation warning:', error.details[0].message);
    }

    // Perform data validation
    const validationResult = this.validateInvoiceData(value);
    value.validation = validationResult;

    return value;
  }

  /**
   * Extract order number from Canadian French invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order number or null
   */
  extractOrderNumber(text) {
    if (!text || typeof text !== 'string') return null;

    // Canadian French order number patterns
    const orderPatterns = [
      /Numéro de commande[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /Commande\s*(?<![-\d])(\d{3}-\d{7}-\d{7})(?![-\d])/i,
      /N°\s+de\s+commande[:\s]*(\d{3}-\d{7}-\d{7})/i,
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
   * Extract order date from Canadian French invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order date or null
   */
  extractOrderDate(text) {
    if (!text || typeof text !== 'string') return null;

    // Canadian French date patterns (similar to French but may use different formats)
    const datePatterns = [
      /Date\s+de\s+commande[:\s]*(\d{1,2}er?\s+[a-zàâäéèêëïîôöùûüÿç]+\s+\d{4})/i,
      /Commande\s+passée\s+le[:\s]*(\d{1,2}er?\s+[a-zàâäéèêëïîôöùûüÿç]+\s+\d{4})/i,
      /Le[:\s]*(\d{1,2}er?\s+[a-zàâäéèêëïîôöùûüÿç]+\s+\d{4})/i,
      // DD/MM/YYYY format (common in Canada)
      /(?:Date\s+de\s+commande|Commande\s+passée\s+le|Le)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      // DD.MM.YYYY format
      /(?:Date\s+de\s+commande|Commande\s+passée\s+le|Le)[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})/i,
      // DD-MM-YYYY format
      /(?:Date\s+de\s+commande|Commande\s+passée\s+le|Le)[:\s]*(\d{1,2}-\d{1,2}-\d{4})/i,
      // Month DD, YYYY format (English influence)
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
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
   * Extract items from Canadian French invoices
   * @param {string} text - Preprocessed text
   * @returns {Array} - Array of item objects
   */
  extractItems(text) {
    if (!text || typeof text !== 'string') return [];

    const items = [];
    const lines = text.split('\n');

    // Canadian French item patterns
    const itemPatterns = [
      /^(\d+)\s*x\s+(.+?)\s+([$\s]*\d+[,.]\d{2})/i,
      /^(\d+)\s+×\s+(.+?)\s+([$\s]*\d+[,.]\d{2})/i,
      /^(.+?)\s+([$\s]*\d+[,.]\d{2})/i,
    ];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      for (const pattern of itemPatterns) {
        const match = trimmedLine.match(pattern);
        if (match && match[3]) {
          let description = match[2] || match[1];
          let price = match[3];

          // Ensure CAD currency symbol is present
          if (price && !price.includes('$')) {
            price = '$' + price;
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
   * Extract subtotal from Canadian French invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Subtotal amount or null
   */
  extractSubtotal(text) {
    if (!text || typeof text !== 'string') return null;

    // Canadian French subtotal patterns
    const subtotalPatterns = [
      /Sous-total[:\s]*([$\s]*\d+[,.]\d{2})/i,
      /Total\s+partiel[:\s]*([$\s]*\d+[,.]\d{2})/i,
      /Sous-total\s+des\s+articles[:\s]*([$\s]*\d+[,.]\d{2})/i,
    ];

    for (const pattern of subtotalPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let amount = match[1].trim();
        if (amount && !amount.includes('$')) {
          amount = '$' + amount;
        }
        return amount;
      }
    }

    return null;
  }

  /**
   * Extract shipping cost from Canadian French invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Shipping amount or null
   */
  extractShipping(text) {
    if (!text || typeof text !== 'string') return null;

    // Canadian French shipping patterns
    const shippingPatterns = [
      /Livraison[:\s]*([$\s]*\d+[,.]\d{2})/i,
      /Frais\s+de\s+port[:\s]*([$\s]*\d+[,.]\d{2})/i,
      /Expédition[:\s]*([$\s]*\d+[,.]\d{2})/i,
      /Frais\s+d'expédition[:\s]*([$\s]*\d+[,.]\d{2})/i,
    ];

    for (const pattern of shippingPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let amount = match[1].trim();
        if (amount && !amount.includes('$')) {
          amount = '$' + amount;
        }
        return amount;
      }
    }

    return null;
  }

  /**
   * Extract tax from Canadian French invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Tax amount or null
   */
  extractTax(text) {
    if (!text || typeof text !== 'string') return null;

    // Canadian tax patterns (GST, PST, HST)
    const taxPatterns = [
      /TPS[:\s]*([$\s]*\d+[,.]\d{2})/i,          // GST (federal)
      /TVP[:\s]*([$\s]*\d+[,.]\d{2})/i,          // GST in French
      /TVH[:\s]*([$\s]*\d+[,.]\d{2})/i,          // HST (harmonized)
      /PST[:\s]*([$\s]*\d+[,.]\d{2})/i,          // PST (provincial)
      /Taxe[:\s]*([$\s]*\d+[,.]\d{2})/i,         // General tax
      /Impôt[:\s]*([$\s]*\d+[,.]\d{2})/i,        // Tax
    ];

    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let amount = match[1].trim();
        if (amount && !amount.includes('$')) {
          amount = '$' + amount;
        }
        return amount;
      }
    }

    return null;
  }

  /**
   * Extract total from Canadian French invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Total amount or null
   */
  extractTotal(text) {
    if (!text || typeof text !== 'string') return null;

    // Canadian French total patterns
    const totalPatterns = [
      /Total[:\s]*([$\s]*\d+[,.]\d{2})/i,
      /Montant\s+total[:\s]*([$\s]*\d+[,.]\d{2})/i,
      /Total\s+TTC[:\s]*([$\s]*\d+[,.]\d{2})/i,
      /À\s+payer[:\s]*([$\s]*\d+[,.]\d{2})/i,
      /Grand\s+total[:\s]*([$\s]*\d+[,.]\d{2})/i,
    ];

    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let amount = match[1].trim();
        if (amount && !amount.includes('$')) {
          amount = '$' + amount;
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
      'total', 'sous-total', 'total partiel', 'livraison', 'frais de port',
      'expédition', 'frais d\'expédition', 'tps', 'tvp', 'tvh', 'pst',
      'taxe', 'impôt', 'à payer', 'montant total', 'ttc'
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
        // Extract numeric value from price string (handle CAD format)
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
      return `$${total.toFixed(2)}`;
    }

    return null;
  }
}

module.exports = CanadianFrenchParser;