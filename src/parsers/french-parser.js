/**
 * French Invoice Parser
 *
 * Specialized parser for French (FR) Amazon invoices
 * Handles Numéro de commande, TVA patterns, and French date formats
 */

const BaseParser = require('./base-parser');

class FrenchParser extends BaseParser {
  constructor() {
    super('French', 'FR');
  }

  /**
   * Main extraction method for French invoices
   * @param {string} text - Preprocessed French invoice text
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
      console.warn('French invoice validation warning:', error.details[0].message);
    }

    // Perform data validation
    const validationResult = this.validateInvoiceData(value);
    value.validation = validationResult;

    return value;
  }

  /**
   * Extract order number from French invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order number or null
   */
  extractOrderNumber(text) {
    if (!text || typeof text !== 'string') return null;

    // French order number patterns
    const orderPatterns = [
      /Numéro\s+de\s+commande[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /N°\s*de\s+commande[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /Commande[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /Référence[:\s]*(\d{3}-\d{7}-\d{7})/i,
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
   * Extract order date from French invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order date or null
   */
  extractOrderDate(text) {
    if (!text || typeof text !== 'string') return null;

    // French date patterns
    const datePatterns = [
      /Date\s+de\s+commande[:\s]*(\d{1,2}er?\s+[a-zàâäéèêëïîôöùûüÿç]+\s+\d{4})/i,
      /Commande\s+du[:\s]*(\d{1,2}er?\s+[a-zàâäéèêëïîôöùûüÿç]+\s+\d{4})/i,
      /Le[:\s]*(\d{1,2}er?\s+[a-zàâäéèêëïîôöùûüÿç]+\s+\d{4})/i,
      // DD/MM/YYYY format
      /(?:Date\s+de\s+commande|Commande\s+du|Le)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      // DD.MM.YYYY format
      /(?:Date\s+de\s+commande|Commande\s+du|Le)[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})/i,
      // DD-MM-YYYY format
      /(?:Date\s+de\s+commande|Commande\s+du|Le)[:\s]*(\d{1,2}-\d{1,2}-\d{4})/i,
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
   * Extract items from French invoices
   * @param {string} text - Preprocessed text
   * @returns {Array} - Array of item objects
   */
  extractItems(text) {
    if (!text || typeof text !== 'string') return [];

    const items = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // French item patterns
      // Pattern: quantity x description price €
      const frenchItemPattern = /(\d+)\s*x\s+(.+?)\s+([\d,.]+)\s*€/i;
      const match = line.match(frenchItemPattern);
      if (match) {
        const [, quantity, description, price] = match;
        items.push({
          description: `${quantity} x ${description.trim()}`,
          price: `${price} €`
        });
        continue;
      }

      // Alternative: description | price €
      const altPattern = /(.+?)\s*\|\s*([\d,.]+)\s*€/i;
      const altMatch = line.match(altPattern);
      if (altMatch) {
        const [, description, price] = altMatch;
        items.push({
          description: description.trim(),
          price: `${price} €`
        });
        continue;
      }

      // Pattern: description price €
      const simplePattern = /(.+?)\s+([\d,.]+)\s*€/i;
      const simpleMatch = line.match(simplePattern);
      if (simpleMatch) {
        const [, description, price] = simpleMatch;
        // Avoid matching totals, subtotals, etc.
        const desc = description.trim();
        if (!/(sous-total|livraison|tva|total)/i.test(desc) && desc.length > 3) {
          items.push({
            description: desc,
            price: `${price} €`
          });
        }
        continue;
      }
    }

    return items;
  }

  /**
   * Extract subtotal from French invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Subtotal amount or null
   */
  extractSubtotal(text) {
    if (!text || typeof text !== 'string') return null;

    // French subtotal patterns
    const subtotalPatterns = [
      /Sous-total[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Sous-total[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Total\s+HT[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Total\s+HT[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
    ];

    for (const pattern of subtotalPatterns) {
      const match = text.match(pattern);
      if (match) {
        let amount = match[1];
        if (match[2]) {
          amount = `${match[1]} ${match[2]}`;
        }

        // Validate
        if (/\d/.test(amount) && !/[a-zA-Z]/.test(amount.replace(/[$€£¥Fr]|CHF|EUR|USD|GBP|JPY/g, ''))) {
          return amount;
        }
      }
    }
    return null;
  }

  /**
   * Extract shipping cost from French invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Shipping amount or null
   */
  extractShipping(text) {
    if (!text || typeof text !== 'string') return null;

    const shippingPatterns = [
      /Livraison[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Livraison[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Frais\s+de\s+port[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Frais\s+de\s+port[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Port[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Port[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
    ];

    for (const pattern of shippingPatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Extract tax (TVA) from French invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Tax amount or null
   */
  extractTax(text) {
    if (!text || typeof text !== 'string') return null;

    // French TVA patterns
    const taxPatterns = [
      // TVA followed by amount €
      /TVA[:\s]*(\d+(?:[.,]\d{1,2})?)\s*€/i,
      /TVA\s+(\d+(?:[.,]\d{1,2})?)\s*€/i,
      /T\.V\.A\.[:\s]*(\d+(?:[.,]\d{1,2})?)\s*€/i,
      /T\.V\.A\.\s+(\d+(?:[.,]\d{1,2})?)\s*€/i,
      // TVA with percentage
      /TVA\s*\((\d+(?:[.,]\d{1,2})?)%\)\s*(\d+(?:[.,]\d{1,2})?)\s*€/i,
      /TVA\s*(\d+(?:[.,]\d{1,2})?)%\s*(\d+(?:[.,]\d{1,2})?)\s*€/i,
    ];

    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match) {
        // Handle patterns with percentage + amount
        return match[2] ? match[2] + ' €' : match[1] + ' €';
      }
    }
    return null;
  }

  /**
   * Extract total from French invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Total amount or null
   */
  extractTotal(text) {
    if (!text || typeof text !== 'string') return null;

    const totalPatterns = [
      /Total\s+TTC[:\s]*(\d+(?:[.,]\d{2})?\s*€)/i,
      /Total\s+TTC[:\s]*(€\d+(?:[.,]\d{2})?)/i,
      /Total[:\s]*(\d+(?:[.,]\d{2})?\s*€)/i,
      /Total[:\s]*(€\d+(?:[.,]\d{2})?)/i,
      /Montant\s+total[:\s]*(\d+(?:[.,]\d{2})?\s*€)/i,
      /Montant\s+total[:\s]*(€\d+(?:[.,]\d{2})?)/i,
      // Fallback for large amounts
      /(?<!TVA:\s*)(?<!\d%\s*)(\d{3,}(?:[.,]\d{2})?\s*€)(?![\d%])/g
    ];

    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        let amount = match[1];
        if (match[2]) {
          amount = `${match[1]} ${match[2]}`;
        }

        // Validate
        if (/\d/.test(amount) && !/[a-zA-Z]/.test(amount.replace(/[$€£¥Fr]|CHF|EUR|USD|GBP|JPY/g, ''))) {
          return amount;
        }
      }
    }
    return null;
  }
}

module.exports = FrenchParser;