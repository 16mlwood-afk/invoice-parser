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
          return this.normalizeDate(dateStr) || dateStr;
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

      // Primary English pattern: ASIN lines followed by price lines (adapted from Spanish)
      const asinMatch = line.match(/ASIN:\s*([A-Z0-9]+)/i);
      if (asinMatch) {
        // Look ahead for the price line (should be the next line or nearby)
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const priceLine = lines[j].trim();

          // English price pattern: quantity x $price (for bulk shipments)
          const bulkPriceMatch = priceLine.match(/(\d+)\s*x\s*[$]([\d,.]+)/);
          if (bulkPriceMatch) {
            const [, quantity, unitPrice] = bulkPriceMatch;
            const totalPrice = (parseFloat(unitPrice.replace(/,/g, '')) * parseInt(quantity)).toFixed(2);

            // Try to find description - look backwards for product name
            let description = 'Amazon Product'; // Default
            for (let k = i - 1; k >= Math.max(0, i - 10); k--) {
              const descLine = lines[k].trim();
              if (descLine && !descLine.includes('ASIN:') && descLine.length > 10) {
                description = descLine;
                break;
              }
            }

            items.push({
              description: description,
              price: `$${totalPrice}`
            });

            i = j; // Skip to after the price line
            break;
          }

          // Alternative pattern: just price without quantity breakdown
          const simplePriceMatch = priceLine.match(/[$]([\d,.]+)/);
          if (simplePriceMatch && !priceLine.includes('x')) {
            const price = `$${simplePriceMatch[1]}`;
            let description = 'Amazon Product';

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

      // Special pattern for bulk order documents: "XX of: [description]"
      const bulkOrderMatch = line.match(/(\d+)\s+of:\s*(.+)/i);
      if (bulkOrderMatch) {
        const [, quantity, description] = bulkOrderMatch;

        // Look ahead for the price (should be within next few lines)
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const priceLine = lines[j].trim();

          // Look for price pattern: $XX.XX
          const priceMatch = priceLine.match(/\$([0-9,]+\.[0-9]{2})/);
          if (priceMatch) {
            const unitPrice = priceMatch[1].replace(/,/g, '');
            const totalPrice = (parseFloat(unitPrice) * parseInt(quantity)).toFixed(2);

            // Clean up description (remove extra whitespace)
            const cleanDescription = description.trim();

            items.push({
              description: `${quantity} x ${cleanDescription}`,
              price: `$${totalPrice}`
            });

            i = j; // Skip to after the price line
            break;
          }
        }
        continue;
      }

      // Fallback English item patterns
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

      // Pattern: description $price (fallback for other patterns)
      const simplePattern = /(.+?)\s+[$]([\d,.]+)/i;
      const simpleMatch = line.match(simplePattern);
      if (simpleMatch) {
        const [, description, price] = simpleMatch;
        const desc = description.trim();

        // Skip financial summary lines, credit card lines, and other non-item lines
        const skipPatterns = [
          /(subtotal|shipping|tax|total|order total)/i,
          /(visa|mastercard|amex|ending in|card)/i,
          /(business price|condition|sold by)/i,
          /(shipping address|shipping speed)/i,
          /^.{0,20}$/  // Very short lines
        ];

        const shouldSkip = skipPatterns.some(pattern => pattern.test(desc));

        if (!shouldSkip && desc.length > 10) {  // Require minimum description length
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
   * Extract discount from English invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Discount amount or null
   */
  extractDiscount(text) {
    if (!text || typeof text !== 'string') return null;

    const discountPatterns = [
      /Discount[:\s]*[$]([\d,.]+)/i,
      /Discount[:\s]*([\d,.]+)\s*[$]/i,
      /Promotion[:\s]*[$]([\d,.]+)/i,
      /Promotion[:\s]*([\d,.]+)\s*[$]/i,
      /Savings[:\s]*[$]([\d,.]+)/i,
      /Savings[:\s]*([\d,.]+)\s*[$]/i,
      /Coupon[:\s]*[$]([\d,.]+)/i,
      /Coupon[:\s]*([\d,.]+)\s*[$]/i,
      /Credit[:\s]*[$]([\d,.]+)/i,
      /Credit[:\s]*([\d,.]+)\s*[$]/i,
    ];

    for (const pattern of discountPatterns) {
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

  /**
   * Enhanced date validation for English dates
   * @param {string} dateStr - Date string to validate
   * @returns {boolean} - True if date appears valid
   */
  isValidDate(dateStr) {
    // Call parent validation first
    if (!super.isValidDate(dateStr)) {
      return false;
    }

    // Additional English-specific validation
    const upperDate = dateStr.toUpperCase();

    // English month names
    const englishMonths = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];

    // Check if it contains an English month
    const hasEnglishMonth = englishMonths.some(month => upperDate.includes(month));

    // Check for MM/DD/YYYY format (common in US)
    const hasUSDateFormat = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(upperDate);

    // Check for DD/MM/YYYY format (common in UK)
    const hasUKDateFormat = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(upperDate);

    return hasEnglishMonth || hasUSDateFormat || hasUKDateFormat;
  }
}

module.exports = EnglishParser;