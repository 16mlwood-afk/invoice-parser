/**
 * Spanish Invoice Parser
 *
 * Specialized parser for Spanish (ES) Amazon invoices
 * Handles ASIN-based item extraction, IVA tax patterns, and Spanish date formats
 */

const BaseParser = require('./base-parser');

class SpanishParser extends BaseParser {
  constructor() {
    super('Spanish', 'ES');
  }

  /**
   * Main extraction method for Spanish invoices
   * @param {string} text - Preprocessed Spanish invoice text
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
      discount: this.extractDiscount(text),
      total: this.extractTotal(text),
      vendor: 'Amazon'
    };

    // Validate against schema
    const { error, value } = this.invoiceSchema.validate(rawInvoice, {
      stripUnknown: true,
      convert: true
    });

    if (error) {
      console.warn('Spanish invoice validation warning:', error.details[0].message);
    }

    // Perform data validation
    const validationResult = this.validateInvoiceData(value);
    value.validation = validationResult;

    return value;
  }

  /**
   * Extract order number from Spanish invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order number or null
   */
  extractOrderNumber(text) {
    if (!text || typeof text !== 'string') return null;

    // Spanish order number patterns
    const orderPatterns = [
      /Número de pedido[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /Pedido\s*(?<![-\d])(\d{3}-\d{7}-\d{7})(?![-\d])/i,
      /Nº\s+de\s+pedido[:\s]*(\d{3}-\d{7}-\d{7})/i,
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
   * Extract order date from Spanish invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order date or null
   */
  extractOrderDate(text) {
    if (!text || typeof text !== 'string') return null;

    // Spanish date patterns
    const datePatterns = [
      /Fecha del pedido[:\s]*(\d{1,2}\s+[a-záéíóúñ]+\s+\d{4})/i,
      /Fecha\s+del?\s+pedido[:\s]*(\d{1,2}\s+[a-záéíóúñ]+\s+\d{4})/i,
      /Pedido\s+del[:\s]*(\d{1,2}\s+[a-záéíóúñ]+\s+\d{4})/i,
      /Fecha[:\s]*(\d{1,2}\s+[a-záéíóúñ]+\s+\d{4})/i,
      // DD/MM/YYYY format (common in Spain)
      /(?:Fecha\s+del?\s+pedido|Pedido\s+del|Fecha)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      // DD.MM.YYYY format
      /(?:Fecha\s+del?\s+pedido|Pedido\s+del|Fecha)[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})/i,
      // DD-MM-YYYY format
      /(?:Fecha\s+del?\s+pedido|Pedido\s+del|Fecha)[:\s]*(\d{1,2}-\d{1,2}-\d{4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1];
        if (this.isValidDate(dateStr)) {
          return this.normalizeDate(dateStr) || dateStr;
        }
      }
    }

    // Fallback to generic date extraction
    return this.extractGenericDate(text);
  }

  /**
   * Extract items from Spanish invoices - focuses on ASIN patterns
   * @param {string} text - Preprocessed text
   * @returns {Array} - Array of item objects
   */
  extractItems(text) {
    if (!text || typeof text !== 'string') return [];

    const items = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Primary Spanish pattern: ASIN lines followed by price lines
      const asinMatch = line.match(/ASIN:\s*([A-Z0-9]+)/i);
      if (asinMatch) {
        // Look ahead for the price line (should be the next line or nearby)
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const priceLine = lines[j].trim();

          // Spanish price pattern: base_price € percentage% included_price € final_price €
          // Example: "1165,27 €0%165,27 €165,27 €" or "1165,27 €21%501,82 €501,82 €"
          const priceMatch = priceLine.match(/([\d.,]+)\s*€(\d+)%([\d.,]+)\s*€([\d.,]+)\s*€/);

          if (priceMatch) {
            const [, basePrice, percentage, includedPrice, finalPrice] = priceMatch;

            // Use the included VAT price (third group)
            const price = `${includedPrice} €`;

            // Try to find description - look backwards for product name
            let description = 'Producto Amazon'; // Default
            for (let k = i - 1; k >= Math.max(0, i - 10); k--) {
              const descLine = lines[k].trim();
              if (descLine && !descLine.includes('ASIN:') && descLine.length > 10) {
                description = descLine;
                break;
              }
            }

            items.push({
              description: description,
              price: price
            });

            i = j; // Skip to after the price line
            break;
          }

          // Alternative pattern: just price without percentage breakdown
          const simplePriceMatch = priceLine.match(/([\d.,]+)\s*€/);
          if (simplePriceMatch && !priceLine.includes('%')) {
            const price = `${simplePriceMatch[1]} €`;
            let description = 'Producto Amazon';

            // Look for description
            for (let k = i - 1; k >= Math.max(0, i - 10); k--) {
              const descLine = lines[k].trim();
              if (descLine && !descLine.includes('ASIN:') && descLine.length > 10) {
                description = descLine;
                break;
              }
            }

            items.push({
              description: description,
              price: price
            });

            i = j;
            break;
          }
        }
        continue;
      }

      // Fallback: look for Spanish item patterns
      // Pattern: quantity x description - price €
      const spanishItemPattern = /(\d+)\s*x\s+(.+?)\s*-\s*([\d.,]+)\s*€/i;
      const match = line.match(spanishItemPattern);
      if (match) {
        const [, quantity, description, price] = match;
        items.push({
          description: `${quantity} x ${description.trim()}`,
          price: `${price} €`
        });
        continue;
      }

      // Alternative: description | price €
      const altPattern = /(.+?)\s*\|\s*([\d.,]+)\s*€/i;
      const altMatch = line.match(altPattern);
      if (altMatch) {
        const [, description, price] = altMatch;
        items.push({
          description: description.trim(),
          price: `${price} €`
        });
        continue;
      }
    }

    return items;
  }

  /**
   * Extract subtotal from Spanish invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Subtotal amount or null
   */
  extractSubtotal(text) {
    if (!text || typeof text !== 'string') return null;

    // Spanish subtotal patterns (most specific first)
    const subtotalPatterns = [
      /Subtotal[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Subtotal[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Base imponible[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i, // Tax base
      /Base imponible[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Importe[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)(?!\s*\d+%)/i, // Avoid matching IVA amounts
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
   * Extract shipping cost from Spanish invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Shipping amount or null
   */
  extractShipping(text) {
    if (!text || typeof text !== 'string') return null;

    const shippingPatterns = [
      /Envío[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Envío[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Gastos de envío[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Gastos de envío[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Portes[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Portes[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
    ];

    for (const pattern of shippingPatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Extract tax (IVA) from Spanish invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Tax amount or null
   */
  extractTax(text) {
    if (!text || typeof text !== 'string') return null;

    // Spanish IVA patterns
    const taxPatterns = [
      // IVA followed by amount €
      /IVA\s*\d+(?:[.,]\d{1,2})?%\s*(\d+(?:[.,]\d{1,2})?)\s*€/i,
      /IVA\s+(\d+(?:[.,]\d{1,2})?)\s*€/i,
      /IVA[:\s]*(\d+(?:[.,]\d{1,2})?)\s*€/i,
      /Impuestos[:\s]*(\d+(?:[.,]\d{1,2})?)\s*€/i,
      /Impuestos\s+(\d+(?:[.,]\d{1,2})?)\s*€/i,
      // IVA with percentage and amount
      /IVA\s*\((\d+)%\)\s*(\d+(?:[.,]\d{1,2})?)\s*€/i,
      /IVA\s*(\d+)%\s*(\d+(?:[.,]\d{1,2})?)\s*€/i,
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
   * Extract discount from Spanish invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Discount amount or null
   */
  extractDiscount(text) {
    if (!text || typeof text !== 'string') return null;

    // Spanish discount patterns
    const discountPatterns = [
      /Descuento[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Descuento[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Descuentos[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Descuentos[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Rebaja[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Rebaja[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Reducción[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Reducción[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Discount[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Discount[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
    ];

    for (const pattern of discountPatterns) {
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
   * Extract total from Spanish invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Total amount or null
   */
  extractTotal(text) {
    if (!text || typeof text !== 'string') return null;

    const totalPatterns = [
      /Total[:\s]*(\d+(?:[.,]\d{2})?\s*€)/i,
      /Total[:\s]*(€\d+(?:[.,]\d{2})?)/i,
      /Importe total[:\s]*(\d+(?:[.,]\d{2})?\s*€)/i,
      /Importe total[:\s]*(€\d+(?:[.,]\d{2})?)/i,
      /Total a pagar[:\s]*(\d+(?:[.,]\d{2})?\s*€)/i,
      /Total a pagar[:\s]*(€\d+(?:[.,]\d{2})?)/i,
      // Fallback for large amounts
      /(?<!ASIN:\s*)(?<!\d%\s*)(\d{3,}(?:[.,]\d{2})?\s*€)(?![\d%])/g
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

  /**
   * Enhanced date validation for Spanish dates
   * @param {string} dateStr - Date string to validate
   * @returns {boolean} - True if date appears valid
   */
  isValidDate(dateStr) {
    // Call parent validation first
    if (!super.isValidDate(dateStr)) {
      return false;
    }

    // Additional Spanish-specific validation
    const upperDate = dateStr.toUpperCase();

    // Spanish month names
    const spanishMonths = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];

    // Check if it contains a Spanish month
    const hasSpanishMonth = spanishMonths.some(month => upperDate.includes(month));

    // Check for DD/MM/YYYY or DD.MM.YYYY format
    const hasSpanishDateFormat = /\b\d{1,2}[./]\d{1,2}[./]\d{4}\b/.test(upperDate);

    return hasSpanishMonth || hasSpanishDateFormat;
  }
}

module.exports = SpanishParser;