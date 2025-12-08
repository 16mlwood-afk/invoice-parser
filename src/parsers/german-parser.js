/**
 * German Invoice Parser
 *
 * Specialized parser for German (DE) Amazon invoices
 * Handles Bestellnummer, MwSt patterns, and German date formats
 */

const BaseParser = require('./base-parser');

class GermanParser extends BaseParser {
  constructor() {
    super('German', 'DE');
  }

  /**
   * Main extraction method for German invoices
   * @param {string} text - Preprocessed German invoice text
   * @param {Object} options - Extraction options including format information
   * @returns {Object} - Extracted invoice data
   */
  extract(text, options = {}) {
    // Use legacy German extraction for non-EU formats (fallback only)
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
      console.warn('German invoice validation warning:', error.details[0].message);
    }

    // Perform data validation
    const validationResult = this.validateInvoiceData(value);
    value.validation = validationResult;

    return value;
  }

  /**
   * Extract order number from German invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order number or null
   */
  extractOrderNumber(text) {
    if (!text || typeof text !== 'string') return null;

    // German order number patterns
    const orderPatterns = [
      /Bestellnummer[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /Bestell-Nr\.?[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /Auftragsnummer[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /Bestellung[:\s]*(\d{3}-\d{7}-\d{7})/i,
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
   * Extract order date from German invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order date or null
   */
  extractOrderDate(text) {
    if (!text || typeof text !== 'string') return null;

    // German date patterns
    const datePatterns = [
      /Bestelldatum[:\s]*(\d{1,2})\.?\s*([A-Za-zäöüß]+)\s+(\d{4})/i,
      /Bestelldatum[:\s]*(\d{1,2}\.\s*[A-Za-zäöüß]+\s+\d{4})/i,
      /Bestelldatum\s+(\d{1,2})\.\s*([A-Za-zäöüß]+)\s+(\d{4})/i,
      /Rechnungsdatum[:\s]*(\d{1,2})\.?\s*([A-Za-zäöüß]+)\s+(\d{4})/i,
      /Rechnungsdatum[:\s]*(\d{1,2}\.\s*[A-Za-zäöüß]+\s+\d{4})/i,
      // DD.MM.YYYY format (common in Germany)
      /(?:Bestelldatum|Rechnungsdatum)[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})/i,
      // DD/MM/YYYY format
      /(?:Bestelldatum|Rechnungsdatum)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      // DD-MM-YYYY format
      /(?:Bestelldatum|Rechnungsdatum)[:\s]*(\d{1,2}-\d{1,2}-\d{4})/i,
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

        // Remove leading dot for German date formats
        if (dateStr.match(/^\d{1,2}\.\s+[A-Za-z]/)) {
          dateStr = dateStr.replace(/^\d{1,2}\.\s*/, '');
        }

        if (this.isValidDate(dateStr)) {
          return this.normalizeDate(dateStr) || dateStr;
        }
      }
    }

    // Fallback to generic date extraction
    return this.extractGenericDate(text);
  }

  /**
   * Extract items from German invoices
   * @param {string} text - Preprocessed text
   * @returns {Array} - Array of item objects
   */
  extractItems(text) {
    if (!text || typeof text !== 'string') return [];

    const items = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Primary German pattern: ASIN lines followed by price lines (adapted from Spanish)
      const asinMatch = line.match(/ASIN:\s*([A-Z0-9]+)/i);
      if (asinMatch) {
        // Look ahead for the price line (should be the next line or nearby)
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const priceLine = lines[j].trim();

          // German price pattern: base_price € percentage% included_price € final_price €
          // Example: "1165,27 €0%165,27 €165,27 €" or "1165,27 €21%501,82 €501,82 €"
          const priceMatch = priceLine.match(/([\d.,]+)\s*€(\d+)%([\d.,]+)\s*€([\d.,]+)\s*€/);
          if (priceMatch) {
            const [, basePrice, percentage, includedPrice, finalPrice] = priceMatch;

            // Use the included VAT price (third group)
            const price = `${includedPrice} €`;

            // Try to find description - look backwards for product name
            let description = 'Amazon Produkt'; // Default
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
            let description = 'Amazon Produkt';

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

      // Fallback German item patterns
      // Pattern: quantity x description price €
      const germanItemPattern = /(\d+)\s*x\s+(.+?)\s+([\d,.]+)\s*€/i;
      const match = line.match(germanItemPattern);
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
        if (!/(subtotal|zwischensumme|versand|mwst|gesamt|total|versandkosten)/i.test(desc) && desc.length > 3) {
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
   * Extract subtotal from German invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Subtotal amount or null
   */
  extractSubtotal(text) {
    if (!text || typeof text !== 'string') return null;

    // German subtotal patterns (most specific first)
    const subtotalPatterns = [
      /Zwischensumme[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Zwischensumme[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Teilsumme[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Teilsumme[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Summe[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Summe[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      // Nettobetrag (net amount)
      /Nettobetrag[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Nettobetrag[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
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
   * Extract shipping cost from German invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Shipping amount or null
   */
  extractShipping(text) {
    if (!text || typeof text !== 'string') return null;

    const shippingPatterns = [
      /Versand[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Versand[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Versandkosten[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Versandkosten[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Versand und Verpackung[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Versand und Verpackung[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Porto[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Porto[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
    ];

    for (const pattern of shippingPatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Extract tax (MwSt) from German invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Tax amount or null
   */
  extractTax(text) {
    if (!text || typeof text !== 'string') return null;

    // German MwSt patterns
    const taxPatterns = [
      // MwSt followed by amount €
      /MwSt[:\s]*(\d+(?:[.,]\d{1,2})?)\s*€/i,
      /MwSt\s+(\d+(?:[.,]\d{1,2})?)\s*€/i,
      /Mehrwertsteuer[:\s]*(\d+(?:[.,]\d{1,2})?)\s*€/i,
      /Mehrwertsteuer\s+(\d+(?:[.,]\d{1,2})?)\s*€/i,
      // MwSt with percentage
      /MwSt\s*\((\d+(?:[.,]\d{1,2})?)%\)\s*(\d+(?:[.,]\d{1,2})?)\s*€/i,
      /MwSt\s*(\d+(?:[.,]\d{1,2})?)%\s*(\d+(?:[.,]\d{1,2})?)\s*€/i,
      // Umsatzsteuer
      /Umsatzsteuer[:\s]*(\d+(?:[.,]\d{1,2})?)\s*€/i,
      /Umsatzsteuer\s+(\d+(?:[.,]\d{1,2})?)\s*€/i,
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
   * Extract discount from German invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Discount amount or null
   */
  extractDiscount(text) {
    if (!text || typeof text !== 'string') return null;

    // German discount patterns
    const discountPatterns = [
      /Rabatt[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Rabatt[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Nachlass[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Nachlass[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Ermäßigung[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Ermäßigung[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
      /Skonto[:\s]*(\d+(?:[.,]\d{1,2})?\s*€)/i,
      /Skonto[:\s]*(€\d+(?:[.,]\d{1,2})?)/i,
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
   * Extract total from German invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Total amount or null
   */
  extractTotal(text) {
    if (!text || typeof text !== 'string') return null;

    const totalPatterns = [
      /Gesamtbetrag[:\s]*(\d+(?:[.,]\d{2})?\s*€)/i,
      /Gesamtbetrag[:\s]*(€\d+(?:[.,]\d{2})?)/i,
      /Gesamtpreis[:\s]*(\d+(?:[.,]\d{2})?\s*€)/i,
      /Gesamtpreis[:\s]*(€\d+(?:[.,]\d{2})?)/i,
      /Gesamtsumme[:\s]*(\d+(?:[.,]\d{2})?\s*€)/i,
      /Gesamtsumme[:\s]*(€\d+(?:[.,]\d{2})?)/i,
      /Total[:\s]*(\d+(?:[.,]\d{2})?\s*€)/i,
      /Total[:\s]*(€\d+(?:[.,]\d{2})?)/i,
      /Endbetrag[:\s]*(\d+(?:[.,]\d{2})?\s*€)/i,
      /Endbetrag[:\s]*(€\d+(?:[.,]\d{2})?)/i,
      // Bruttobetrag (gross amount)
      /Bruttobetrag[:\s]*(\d+(?:[.,]\d{2})?\s*€)/i,
      /Bruttobetrag[:\s]*(€\d+(?:[.,]\d{2})?)/i,
      // Fallback for large amounts (avoid tax sections)
      /(?<!MwSt:\s*)(?<!\d%\s*)(?<!IVA\s+)(\d{3,}(?:[.,]\d{2})?\s*€)(?![\d%])/i
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
   * Enhanced date validation for German dates
   * @param {string} dateStr - Date string to validate
   * @returns {boolean} - True if date appears valid
   */
  isValidDate(dateStr) {
    // Call parent validation first
    if (!super.isValidDate(dateStr)) {
      return false;
    }

    // Additional German-specific validation
    const upperDate = dateStr.toUpperCase();

    // German month names
    const germanMonths = [
      'JANUAR', 'FEBRUAR', 'MÄRZ', 'APRIL', 'MAI', 'JUNI',
      'JULI', 'AUGUST', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DEZEMBER'
    ];

    // Check if it contains a German month
    const hasGermanMonth = germanMonths.some(month => upperDate.includes(month));

    // Check for DD.MM.YYYY format
    const hasGermanDateFormat = /\b\d{1,2}\.\d{1,2}\.\d{4}\b/.test(upperDate);

    return hasGermanMonth || hasGermanDateFormat;
  }
}

module.exports = GermanParser;