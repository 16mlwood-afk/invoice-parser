/**
 * Japanese Invoice Parser
 *
 * Specialized parser for Japanese (JP) Amazon invoices
 * Handles Japanese date formats (YYYY年MM月DD日), yen currency (¥), and Japanese-specific terms
 */

const BaseParser = require('./base-parser');

class JapaneseParser extends BaseParser {
  constructor() {
    super('Japanese', 'JP');
  }

  /**
   * Main extraction method for Japanese invoices
   * @param {string} text - Preprocessed Japanese invoice text
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
      console.warn('Japanese invoice validation warning:', error.details[0].message);
    }

    // Perform data validation
    const validationResult = this.validateInvoiceData(value);
    value.validation = validationResult;

    return value;
  }

  /**
   * Extract order number from Japanese invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order number or null
   */
  extractOrderNumber(text) {
    if (!text || typeof text !== 'string') return null;

    // Japanese order number patterns
    const orderPatterns = [
      /注文番号[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /注文\s*(?<![-\d])(\d{3}-\d{7}-\d{7})(?![-\d])/i,
      /オーダー番号[:\s]*(\d{3}-\d{7}-\d{7})/i,
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
   * Extract order date from Japanese invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order date or null
   */
  extractOrderDate(text) {
    if (!text || typeof text !== 'string') return null;

    // Japanese date patterns
    const datePatterns = [
      /注文日[:\s]*(\d{4}年\d{1,2}月\d{1,2}日)/i,
      /注文日時[:\s]*(\d{4}年\d{1,2}月\d{1,2}日)/i,
      /注文された日[:\s]*(\d{4}年\d{1,2}月\d{1,2}日)/i,
      /日付[:\s]*(\d{4}年\d{1,2}月\d{1,2}日)/i,
      // YYYY/MM/DD format
      /(?:注文日|注文日時|注文された日|日付)[:\s]*(\d{4}\/\d{1,2}\/\d{1,2})/i,
      // YYYY.MM.DD format
      /(?:注文日|注文日時|注文された日|日付)[:\s]*(\d{4}\.\d{1,2}\.\d{1,2})/i,
      // YYYY-MM-DD format
      /(?:注文日|注文日時|注文された日|日付)[:\s]*(\d{4}-\d{1,2}-\d{1,2})/i,
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
   * Extract items from Japanese invoices
   * @param {string} text - Preprocessed text
   * @returns {Array} - Array of item objects
   */
  extractItems(text) {
    if (!text || typeof text !== 'string') return [];

    const items = [];
    const lines = text.split('\n');

    // Japanese item patterns
    const itemPatterns = [
      /^(\d+)\s*×\s+(.+?)\s+([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
      /^(\d+)\s*個\s+(.+?)\s+([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
      /^(.+?)\s+([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
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
   * Extract subtotal from Japanese invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Subtotal amount or null
   */
  extractSubtotal(text) {
    if (!text || typeof text !== 'string') return null;

    // Japanese subtotal patterns
    const subtotalPatterns = [
      /小計[:\s]*([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
      /商品小計[:\s]*([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
      /合計金額[:\s]*([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
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
   * Extract shipping cost from Japanese invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Shipping amount or null
   */
  extractShipping(text) {
    if (!text || typeof text !== 'string') return null;

    // Japanese shipping patterns
    const shippingPatterns = [
      /配送料[:\s]*([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
      /送料[:\s]*([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
      /運送料[:\s]*([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
      /手数料[:\s]*([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
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
   * Extract tax from Japanese invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Tax amount or null
   */
  extractTax(text) {
    if (!text || typeof text !== 'string') return null;

    // Japanese tax patterns (consumption tax)
    const taxPatterns = [
      /消費税[:\s]*([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
      /税金[:\s]*([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
      /税額[:\s]*([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
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
   * Extract total from Japanese invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Total amount or null
   */
  extractTotal(text) {
    if (!text || typeof text !== 'string') return null;

    // Japanese total patterns
    const totalPatterns = [
      /合計[:\s]*([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
      /総額[:\s]*([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
      /お支払い金額[:\s]*([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
      /お支払額[:\s]*([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
      /総計[:\s]*([¥£$]\s*\d{1,3}(?:,\d{3})*)/i,
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
      '合計', '総額', '小計', '商品小計', '配送料', '送料', '運送料',
      '消費税', '税金', '税額', '手数料', 'お支払い', '総計'
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
        // Extract numeric value from price string (handle Japanese yen format)
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
      return `¥${total.toLocaleString()}`;
    }

    return null;
  }
}

module.exports = JapaneseParser;