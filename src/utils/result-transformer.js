/**
 * Result transformation utilities for converting raw processing results
 * to frontend-compatible invoice data format
 */

/**
 * Parses currency strings (e.g., "$123.45", "55,45 €", "-$10.00") into numbers formatted to 2 decimal places
 * Handles both US (1,234.56) and European (1.234,56) decimal formats
 * @param {string|null} currencyString - Currency string to parse
 * @returns {number|null} Parsed number formatted to 2 decimal places or null
 */
function parseCurrencyString(currencyString) {
  if (!currencyString || typeof currencyString !== 'string') {
    return null;
  }

  // Remove currency symbols and extra whitespace
  const cleaned = currencyString.replace(/[$€£¥Fr]|CHF|EUR|USD|GBP|JPY/g, '').trim();

  // Handle empty strings
  if (!cleaned) {
    return null;
  }

  // Handle European decimal format (comma as decimal separator)
  let numericStr = cleaned;
  if (cleaned.match(/^\d{1,3}(?:\.\d{3})*,\d{2}$/)) {
    // European format: 1.234,56 → 1234.56
    numericStr = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.match(/^\d{1,3}(?:,\d{3})*\.\d{2}$/)) {
    // US/UK format: 1,234.56 → 1234.56
    numericStr = cleaned.replace(/,/g, '');
  } else if (cleaned.match(/^\d+[,.]\d+$/)) {
    // Simple decimal: ensure it's valid by converting comma to dot
    numericStr = cleaned.replace(',', '.');
  }

  // Parse the number
  const parsed = parseFloat(numericStr);
  if (isNaN(parsed)) {
    return null;
  }

  // Return the number as-is - precision is maintained in the numeric value
  // Frontend should use toFixed(2) for display to ensure 2 decimal places
  return parsed;
}

/**
 * Transforms item data to ensure numeric fields are properly typed
 * @param {Object} item - Raw item data from parser
 * @returns {Object} Transformed item data
 */
function transformItem(item) {
  if (!item || typeof item !== 'object') {
    return item;
  }

  return {
    ...item,
    quantity: typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || null,
    unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : parseCurrencyString(item.unitPrice),
    totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice : parseCurrencyString(item.totalPrice),
    total: typeof item.total === 'number' ? item.total :
           typeof item.totalPrice === 'number' ? item.totalPrice :
           parseCurrencyString(item.total || item.totalPrice)
  };
}

/**
 * Transforms raw processing results into frontend InvoiceData format
 * @param {Array} rawResults - Raw processing results from ProcessingAPI
 * @returns {Array} Transformed invoice results
 */
function transformResultsForExport(rawResults) {
  if (!Array.isArray(rawResults)) {
    throw new Error('rawResults must be an array');
  }

  return rawResults
    .filter(result => result && result.success)
    .map(result => {
      const data = result.data;
      if (!data) {
        return {
          filename: result.filename,
          orderNumber: null,
          orderDate: null,
          customerInfo: null,
          items: [],
          totals: {
            subtotal: null,
            shipping: null,
            tax: null,
            total: null
          },
          currency: null,
          validationStatus: 'warning',
          validationErrors: ['No data extracted from invoice']
        };
      }

      return {
        filename: result.filename,
        orderNumber: data.orderNumber,
        orderDate: data.orderDate,
        customerInfo: data.customerInfo,
        items: (data.items || []).map(transformItem),
        totals: {
          subtotal: parseCurrencyString(data.subtotal),
          shipping: parseCurrencyString(data.shipping),
          tax: parseCurrencyString(data.tax),
          discount: parseCurrencyString(data.discount),
          total: parseCurrencyString(data.total)
        },
        taxDetails: {
          vatRate: data.vatRate,
          taxAmount: parseCurrencyString(data.tax)
        },
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress,
        paymentMethod: data.paymentMethod,
        confidenceScores: data.confidenceScores,
        currency: data.currency,
        validationStatus: data.validation?.isValid ? 'valid' : 'invalid',
        validationErrors: [
          ...(data.validation?.errors?.map(e => e.message) || []),
          ...(data.validation?.warnings?.map(w => w.message) || [])
        ]
      };
    });
}

module.exports = {
  transformResultsForExport
};