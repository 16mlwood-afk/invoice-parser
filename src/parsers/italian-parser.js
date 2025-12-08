/**
 * Italian Invoice Parser
 *
 * Specialized parser for Italian (IT) Amazon invoices
 * Handles IVA tax patterns, Italian date formats, and Italian-specific terms
 */

const BaseParser = require('./base-parser');

class ItalianParser extends BaseParser {
  constructor() {
    super('Italian', 'IT');
  }

  /**
   * Main extraction method for Italian invoices
   * @param {string} text - Preprocessed Italian invoice text
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
      console.warn('Italian invoice validation warning:', error.details[0].message);
    }

    // Perform data validation
    const validationResult = this.validateInvoiceData(value);
    value.validation = validationResult;

    return value;
  }

  /**
   * Extract order number from Italian invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order number or null
   */
  extractOrderNumber(text) {
    if (!text || typeof text !== 'string') return null;

    // Italian order number patterns
    const orderPatterns = [
      /Numero d'ordine[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /Ordine\s*(?<![-\d])(\d{3}-\d{7}-\d{7})(?![-\d])/i,
      /N\.\s*d'ordine[:\s]*(\d{3}-\d{7}-\d{7})/i,
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
   * Extract order date from Italian invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order date or null
   */
  extractOrderDate(text) {
    if (!text || typeof text !== 'string') return null;

    // Italian date patterns
    const datePatterns = [
      // Amazon EU specific patterns (most specific first)
      /Data ordine(\d{1,2}\.\d{1,2}\.\d{4})/i,
      /Data ordine\s*[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})/i,
      /Data ordine\s*[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /Ordine effettuato il\s*[:\s]*(\d{1,2}\s+[a-zàèéìòù]+\s+\d{4})/i,
      // Existing patterns
      /Data dell'ordine[:\s]*(\d{1,2}\s+[a-zàèéìíîòóùú]+\s+\d{4})/i,
      /Data\s+dell'ordine[:\s]*(\d{1,2}\s+[a-zàèéìíîòóùú]+\s+\d{4})/i,
      /Ordine\s+del[:\s]*(\d{1,2}\s+[a-zàèéìíîòóùú]+\s+\d{4})/i,
      /Data[:\s]*(\d{1,2}\s+[a-zàèéìíîòóùú]+\s+\d{4})/i,
      // DD/MM/YYYY format (common in Italy)
      /Data[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      // DD.MM.YYYY format
      /Data[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})/i,
      // DD-MM-YYYY format
      /Data[:\s]*(\d{1,2}-\d{1,2}-\d{4})/i,
      // Month DD, YYYY format (English fallback)
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
      // Generic month name patterns
      /(\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+\d{4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1].trim();
        if (this.isValidDate(dateStr)) {
          return this.normalizeDate(dateStr) || dateStr;
        }
      }
    }

    // Fallback to generic date extraction
    return this.extractGenericDate(text);
  }

  /**
   * Extract items from Italian invoices
   * @param {string} text - Preprocessed text
   * @returns {Array} - Array of item objects
   */
  extractItems(text) {
    if (!text || typeof text !== 'string') return [];

    const items = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Primary Italian pattern: ASIN lines followed by price lines (adapted from Spanish)
      const asinMatch = line.match(/ASIN:\s*([A-Z0-9]+)/i);
      if (asinMatch) {
        // Look ahead for the price line (should be the next line or nearby)
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const priceLine = lines[j].trim();

          // Italian price pattern: base_price € percentage% included_price € final_price €
          // Example: "1165,27 €0%165,27 €165,27 €" or "1165,27 €21%501,82 €501,82 €"
          const priceMatch = priceLine.match(/([\d.,]+)\s*€(\d+)%([\d.,]+)\s*€([\d.,]+)\s*€/);
          if (priceMatch) {
            const [, basePrice, percentage, includedPrice, finalPrice] = priceMatch;

            // Use the included VAT price (third group)
            const price = `${includedPrice} €`;

            // Try to find description - look backwards for product name
            let description = 'Prodotto Amazon'; // Default
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
            let description = 'Prodotto Amazon';

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

      // Fallback Italian item patterns
      const itemPatterns = [
        /^(\d+)\s*x\s+(.+?)\s+([€£$]\s*\d+[,.]\d{2})/i,
        /^(\d+)\s+×\s+(.+?)\s+([€£$]\s*\d+[,.]\d{2})/i,
        /^(\d+)\s+di\s+(.+?)\s+([€£$]\s*\d+[,.]\d{2})/i,
        /^(.+?)\s+([€£$]\s*\d+[,.]\d{2})/i,
      ];

      for (const pattern of itemPatterns) {
        const match = line.match(pattern);
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
   * Extract subtotal from Italian invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Subtotal amount or null
   */
  extractSubtotal(text) {
    if (!text || typeof text !== 'string') return null;

    // Italian subtotal patterns
    const subtotalPatterns = [
      /Subtotale[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Totale\s+parziale[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Importo\s+parziale[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Totale\s+merce[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
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
   * Extract shipping cost from Italian invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Shipping amount or null
   */
  extractShipping(text) {
    if (!text || typeof text !== 'string') return null;

    // Italian shipping patterns
    const shippingPatterns = [
      /Spedizione[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Consegna[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Costi\s+di\s+spedizione[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Spese\s+di\s+spedizione[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
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
   * Extract tax (IVA) from Italian invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Tax amount or null
   */
  extractTax(text) {
    if (!text || typeof text !== 'string') return null;

    // Italian tax (IVA) patterns
    const taxPatterns = [
      /IVA[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Imposta\s+sul\s+valore\s+aggiunto[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Tassa[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Imposta[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
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
   * Extract discount from Italian invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Discount amount or null
   */
  extractDiscount(text) {
    if (!text || typeof text !== 'string') return null;

    // Italian discount patterns
    const discountPatterns = [
      /Sconto[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Ribasso[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Riduzione[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Detrazione[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Abbuono[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Remise[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Discount[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
    ];

    for (const pattern of discountPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract total from Italian invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Total amount or null
   */
  extractTotal(text) {
    if (!text || typeof text !== 'string') return null;

    // Italian total patterns
    const totalPatterns = [
      /Totale[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Importo\s+totale[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Totale\s+da\s+pagare[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Totale\s+ordine[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
      /Grand\s+Total[:\s]*([€£$]\s*\d+[,.]\d{2})/i,
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
      'totale', 'total', 'subtotale', 'subtotal', 'iva', 'tassa',
      'spedizione', 'consegna', 'costi di spedizione', 'spese di spedizione',
      'imposta', 'pagare', 'ordine', 'merce', 'parziale'
    ];

    const lowerText = text.toLowerCase();
    return totalKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Enhanced date validation for Italian dates
   * @param {string} dateStr - Date string to validate
   * @returns {boolean} - True if date appears valid
   */
  isValidDate(dateStr) {
    // Call parent validation first
    if (!super.isValidDate(dateStr)) {
      return false;
    }

    // Additional Italian-specific validation
    const upperDate = dateStr.toUpperCase();

    // Italian month names
    const italianMonths = [
      'GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO',
      'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE'
    ];

    // Check if it contains an Italian month
    const hasItalianMonth = italianMonths.some(month => upperDate.includes(month));

    // Check for DD/MM/YYYY or DD.MM.YYYY format (common in Italy)
    const hasItalianDateFormat = /\b\d{1,2}[\/.]\d{1,2}[\/.]\d{4}\b/.test(upperDate);

    return hasItalianMonth || hasItalianDateFormat;
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
        // Extract numeric value from price string
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
      return `€${total.toFixed(2)}`;
    }

    return null;
  }
}

module.exports = ItalianParser;