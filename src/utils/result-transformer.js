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

/**
 * Calculates batch totals across multiple jobs for accounting purposes
 * @param {Array} jobStatuses - Array of job status objects from ProcessingAPI
 * @param {Array} jobResults - Array of job results arrays from ProcessingAPI
 * @returns {Object} Batch totals summary with aggregated financial data
 */
function calculateBatchTotals(jobStatuses, jobResults) {
  if (!Array.isArray(jobStatuses) || !Array.isArray(jobResults)) {
    throw new Error('jobStatuses and jobResults must be arrays');
  }

  if (jobStatuses.length !== jobResults.length) {
    throw new Error('jobStatuses and jobResults arrays must have the same length');
  }

  const batchSummary = {
    totalJobs: jobStatuses.length,
    totalInvoices: 0,
    successfulInvoices: 0,
    failedInvoices: 0,
    jobs: [],
    totals: {
      total: 0,
      subtotal: 0,
      shipping: 0,
      tax: 0,
      discount: 0
    },
    currencies: new Map(), // Track totals by currency
    exportDate: new Date().toISOString()
  };

  // Process each job
  jobStatuses.forEach((jobStatus, index) => {
    const jobResultsData = jobResults[index];
    const transformedResults = transformResultsForExport(jobResultsData);

    // Calculate job totals
    const jobTotals = {
      total: 0,
      subtotal: 0,
      shipping: 0,
      tax: 0,
      discount: 0
    };

    let jobCurrency = null;
    const currencyCounts = new Map();

    // Aggregate totals from successful invoices in this job
    transformedResults.forEach(invoice => {
      if (invoice.totals) {
        jobTotals.total += invoice.totals.total || 0;
        jobTotals.subtotal += invoice.totals.subtotal || 0;
        jobTotals.shipping += invoice.totals.shipping || 0;
        jobTotals.tax += invoice.totals.tax || 0;
        jobTotals.discount += invoice.totals.discount || 0;

        // Track currency usage
        if (invoice.currency) {
          currencyCounts.set(invoice.currency, (currencyCounts.get(invoice.currency) || 0) + 1);
          if (!jobCurrency) {
            jobCurrency = invoice.currency;
          }
        }
      }
    });

    // Determine primary currency for this job (most common)
    if (currencyCounts.size > 0) {
      jobCurrency = Array.from(currencyCounts.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
    }

    // Update batch totals
    batchSummary.totalInvoices += transformedResults.length;
    batchSummary.successfulInvoices += transformedResults.length; // Only successful ones are in transformedResults
    batchSummary.failedInvoices += jobStatus.progress.failed;

    batchSummary.totals.total += jobTotals.total;
    batchSummary.totals.subtotal += jobTotals.subtotal;
    batchSummary.totals.shipping += jobTotals.shipping;
    batchSummary.totals.tax += jobTotals.tax;
    batchSummary.totals.discount += jobTotals.discount;

    // Update currency-specific totals
    if (jobCurrency) {
      if (!batchSummary.currencies.has(jobCurrency)) {
        batchSummary.currencies.set(jobCurrency, {
          total: 0,
          subtotal: 0,
          shipping: 0,
          tax: 0,
          discount: 0,
          invoiceCount: 0
        });
      }

      const currencyTotals = batchSummary.currencies.get(jobCurrency);
      currencyTotals.total += jobTotals.total;
      currencyTotals.subtotal += jobTotals.subtotal;
      currencyTotals.shipping += jobTotals.shipping;
      currencyTotals.tax += jobTotals.tax;
      currencyTotals.discount += jobTotals.discount;
      currencyTotals.invoiceCount += transformedResults.length;
    }

    // Add job summary
    batchSummary.jobs.push({
      jobId: jobStatus.id,
      created: jobStatus.created,
      completed: jobStatus.completed,
      invoiceCount: transformedResults.length,
      successfulInvoices: jobStatus.progress.successful,
      failedInvoices: jobStatus.progress.failed,
      successRate: jobStatus.progress.total > 0
        ? Math.round((jobStatus.progress.successful / jobStatus.progress.total) * 100 * 10) / 10
        : 0,
      totals: jobTotals,
      currency: jobCurrency
    });
  });

  // Convert currencies Map to object for JSON serialization
  batchSummary.currencies = Object.fromEntries(
    Array.from(batchSummary.currencies.entries()).map(([currency, totals]) => [
      currency,
      {
        ...totals,
        // Round to 2 decimal places for display
        total: Math.round(totals.total * 100) / 100,
        subtotal: Math.round(totals.subtotal * 100) / 100,
        shipping: Math.round(totals.shipping * 100) / 100,
        tax: Math.round(totals.tax * 100) / 100,
        discount: Math.round(totals.discount * 100) / 100
      }
    ])
  );

  // Round main totals
  batchSummary.totals.total = Math.round(batchSummary.totals.total * 100) / 100;
  batchSummary.totals.subtotal = Math.round(batchSummary.totals.subtotal * 100) / 100;
  batchSummary.totals.shipping = Math.round(batchSummary.totals.shipping * 100) / 100;
  batchSummary.totals.tax = Math.round(batchSummary.totals.tax * 100) / 100;
  batchSummary.totals.discount = Math.round(batchSummary.totals.discount * 100) / 100;

  return batchSummary;
}

module.exports = {
  transformResultsForExport,
  calculateBatchTotals
};