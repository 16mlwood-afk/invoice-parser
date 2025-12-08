const { invoiceSchema, reportSchema } = require('../types/schemas');

class Validation {
  constructor() {
    this.invoiceSchema = invoiceSchema;
    this.reportSchema = reportSchema;
  }

  // Validate and format JSON output
  validateJsonOutput(invoice) {
    try {
      const { error, value } = this.invoiceSchema.validate(invoice, {
        stripUnknown: true,
        convert: true
      });

      if (error) {
        console.error('JSON validation error:', error.details[0].message);
        return null;
      }

      return value;
    } catch (validationError) {
      console.error('JSON validation failed:', validationError.message);
      return null;
    }
  }

  // Validate report JSON output
  validateReportOutput(report) {
    try {
      const { error, value } = this.reportSchema.validate(report, {
        stripUnknown: true,
        convert: true
      });

      if (error) {
        console.error('Report JSON validation error:', error.details[0].message);
        return null;
      }

      return value;
    } catch (validationError) {
      console.error('Report JSON validation failed:', validationError.message);
      return null;
    }
  }

  // Ensure currency formatting is preserved in JSON
  formatCurrency(amount) {
    if (!amount) return null;

    // Preserve original currency formatting
    // joi validation ensures proper currency pattern
    return amount;
  }

  // Comprehensive data validation for extracted invoice data
  validateInvoiceData(invoice) {
    if (!invoice) {
      return {
        score: 0,
        isValid: false,
        warnings: [],
        errors: [{
          type: 'null_invoice',
          severity: 'high',
          message: 'Invoice data is null or undefined',
          fields: []
        }],
        summary: 'Invoice data is null or undefined'
      };
    }

    const validation = {
      isValid: true,
      warnings: [],
      errors: [],
      score: 100
    };

    // Preserve any existing metadata from the invoice
    if (invoice.errorRecovery) {
      validation.errorRecovery = invoice.errorRecovery;
    }
    if (invoice.extractionMetadata) {
      validation.extractionMetadata = invoice.extractionMetadata;
    }

    // Mathematical consistency validation
    this.validateMathematicalConsistency(invoice, validation);

    // Date validation
    this.validateDateConsistency(invoice, validation);

    // Currency validation
    this.validateCurrencyConsistency(invoice, validation);

    // Data completeness validation
    this.validateDataCompleteness(invoice, validation);

    // Calculate validation score based on issues
    validation.score = Math.max(0, 100 - (validation.errors.length * 20) - (validation.warnings.length * 5));
    validation.isValid = validation.isValid && validation.errors.length === 0;
    validation.summary = this.generateValidationSummary(validation);

    return validation;
  }

  // Validate mathematical consistency (subtotal + shipping + tax ≈ total)
  validateMathematicalConsistency(invoice, validation) {
    try {
      // Extract numeric values from amounts
      const subtotal = this.extractNumericValue(invoice.subtotal);
      const shipping = this.extractNumericValue(invoice.shipping);
      const tax = this.extractNumericValue(invoice.tax);
      const total = this.extractNumericValue(invoice.total);

      if (total > 0) {
        // Check if this looks like a complex multi-shipment order
        // Multi-shipment orders often have multiple subtotals and don't follow simple math
        const text = invoice._rawText || '';
        const hasMultipleShipments = (text.match(/Item\(s\) Subtotal/g) || []).length > 1 ||
                                   (text.match(/Zwischensumme/g) || []).length > 1 ||
                                   (text.match(/Sous-total/g) || []).length > 1;

        // For complex orders, be more lenient with mathematical consistency
        const isComplexOrder = hasMultipleShipments || subtotal > total * 2; // subtotal much larger than total suggests multiple shipments

        // Calculate expected total
        const calculatedTotal = (subtotal || 0) + (shipping || 0) + (tax || 0);

        // Adjust tolerance based on order complexity
        const baseTolerance = Math.max(total * 0.01, 0.10);
        const tolerance = isComplexOrder ? Math.max(baseTolerance * 3, total * 0.05) : baseTolerance;

        const difference = Math.abs(calculatedTotal - total);

        if (difference > tolerance) {
          const percentDiff = (difference / total) * 100;
          const severity = isComplexOrder ? 'low' : 'medium';
          const scorePenalty = isComplexOrder ? 5 : 10;

          validation.warnings.push({
            type: 'mathematical_inconsistency',
            severity: severity,
            message: `${isComplexOrder ? 'Complex order: ' : ''}Calculated total (${calculatedTotal.toFixed(2)}) differs from extracted total (${total.toFixed(2)}) by ${difference.toFixed(2)} (${percentDiff.toFixed(1)}%)${isComplexOrder ? ' (multi-shipment order may have complex pricing)' : ''}`,
            fields: ['subtotal', 'shipping', 'tax', 'total']
          });
          validation.score -= scorePenalty;
        }
      }

      // Validate item totals if items are present
      if (invoice.items && invoice.items.length > 0) {
        const itemsTotal = invoice.items.reduce((sum, item) => {
          const price = this.extractNumericValue(item.price);
          return sum + (price || 0);
        }, 0);

        if (subtotal > 0 && Math.abs(itemsTotal - subtotal) > 0.10) {
          validation.warnings.push({
            type: 'item_subtotal_mismatch',
            severity: 'low',
            message: `Sum of item prices (${itemsTotal.toFixed(2)}) doesn't match subtotal (${subtotal.toFixed(2)})`,
            fields: ['items', 'subtotal']
          });
          validation.score -= 5;
        }
      }
    } catch (error) {
      validation.warnings.push({
        type: 'calculation_error',
        severity: 'low',
        message: `Could not perform mathematical validation: ${error.message}`,
        fields: ['subtotal', 'shipping', 'tax', 'total']
      });
    }
  }

  // Validate date consistency and format
  validateDateConsistency(invoice, validation) {
    if (!invoice.orderDate) {
      validation.warnings.push({
        type: 'missing_date',
        severity: 'medium',
        message: 'Order date is missing',
        fields: ['orderDate']
      });
      validation.score -= 10;
      return;
    }

    try {
      // Try to parse the date
      const dateStr = invoice.orderDate.toString();

      // Check for obviously invalid dates
      if (dateStr.includes('undefined') || dateStr.includes('null')) {
        validation.errors.push({
          type: 'invalid_date_format',
          severity: 'high',
          message: 'Date contains invalid placeholder values',
          fields: ['orderDate']
        });
        validation.score -= 20;
        return;
      }

      // Check for future dates (more than 1 day in the future)
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // This is a basic check - in a real implementation, you'd want more sophisticated date parsing
      if (dateStr.match(/\d{4}/)) {
        const yearMatch = dateStr.match(/(\d{4})/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1]);
          if (year > tomorrow.getFullYear() + 1) {
            validation.warnings.push({
              type: 'future_date',
              severity: 'low',
              message: `Order date appears to be in the future: ${dateStr}`,
              fields: ['orderDate']
            });
            validation.score -= 5;
          } else if (year < 2010) {
            validation.warnings.push({
              type: 'very_old_date',
              severity: 'low',
              message: `Order date appears to be very old: ${dateStr}`,
              fields: ['orderDate']
            });
            validation.score -= 5;
          }
        }
      }
    } catch (error) {
      validation.warnings.push({
        type: 'date_parsing_error',
        severity: 'low',
        message: `Could not validate date format: ${error.message}`,
        fields: ['orderDate']
      });
    }
  }

  // Validate currency consistency across all monetary fields
  validateCurrencyConsistency(invoice, validation) {
    const currencyFields = ['subtotal', 'shipping', 'tax', 'total'];
    const itemPrices = (invoice.items && Array.isArray(invoice.items)) ? invoice.items.map(item => item.price).filter(Boolean) : [];

    const currencies = new Set();

    // Collect all currencies found
    for (const field of currencyFields) {
      const value = invoice[field];
      if (value) {
        const currency = this.extractCurrencySymbol(value);
        if (currency) {
          currencies.add(currency);
        }
      }
    }

    for (const price of itemPrices) {
      const currency = this.extractCurrencySymbol(price);
      if (currency) {
        currencies.add(currency);
      }
    }

    // Check for multiple currencies (warn only if inconsistent within main fields)
    if (currencies.size > 1) {
      // Separate currencies from main invoice fields vs item prices
      const mainFieldCurrencies = new Set();
      const itemCurrencies = new Set();

      for (const field of currencyFields) {
        const value = invoice[field];
        if (value) {
          const currency = this.extractCurrencySymbol(value);
          if (currency) {
            mainFieldCurrencies.add(currency);
          }
        }
      }

      for (const price of itemPrices) {
        const currency = this.extractCurrencySymbol(price);
        if (currency) {
          itemCurrencies.add(currency);
        }
      }

      // Only warn if main invoice fields have inconsistent currencies
      if (mainFieldCurrencies.size > 1) {
      validation.warnings.push({
          type: 'inconsistent_invoice_currencies',
          severity: 'medium',
          message: `Inconsistent currencies in invoice fields: ${Array.from(mainFieldCurrencies).join(', ')}`,
          fields: currencyFields
        });
        validation.score -= 10;
      } else if (itemCurrencies.size > 1 && mainFieldCurrencies.size === 1) {
        // Different currencies in items but consistent main fields - just informational
        validation.warnings.push({
          type: 'multiple_currencies',
        severity: 'low',
          message: `Items have different currencies but invoice totals are consistent`,
          fields: ['items']
      });
        validation.score -= 2;
      }
    }

    // Validate currency formats are reasonable
    for (const field of currencyFields) {
      const value = invoice[field];
      if (value && typeof value === 'string') {
        if (!this.isValidCurrencyFormat(value)) {
          validation.warnings.push({
            type: 'invalid_currency_format',
            severity: 'medium',
            message: `Invalid currency format in ${field}: ${value}`,
            fields: [field]
          });
          validation.score -= 10;
        }
      }
    }
  }

  // Validate data completeness and quality
  validateDataCompleteness(invoice, validation) {
    // Check for missing critical fields
    const criticalFields = ['orderNumber', 'total'];
    for (const field of criticalFields) {
      if (!invoice[field]) {
        validation.errors.push({
          type: 'missing_critical_field',
          severity: 'high',
          message: `Critical field '${field}' is missing`,
          fields: [field]
        });
        validation.score -= 20;
      }
    }

    // Check for empty items array (be more lenient - some invoices may not have detailed itemization)
    if (!invoice.items || invoice.items.length === 0) {
      // Only warn if we have a subtotal but no items (suggests parsing issue)
      const hasSubtotal = invoice.subtotal && this.extractNumericValue(invoice.subtotal) > 0;
      if (hasSubtotal) {
      validation.warnings.push({
        type: 'no_items_found',
          severity: 'medium',
          message: 'No items were extracted from the invoice despite having a subtotal',
        fields: ['items']
      });
        validation.score -= 5;
      }
    }

    // Check for suspiciously high or low totals
    const total = this.extractNumericValue(invoice.total);
    if (total > 0) {
      if (total > 10000) {
        validation.warnings.push({
          type: 'high_total_amount',
          severity: 'low',
          message: `Total amount is unusually high: ${total.toFixed(2)}`,
          fields: ['total']
        });
      } else if (total < 1) {
        validation.warnings.push({
          type: 'low_total_amount',
          severity: 'low',
          message: `Total amount is unusually low: ${total.toFixed(2)}`,
          fields: ['total']
        });
      }
    }
  }

  // Generate a human-readable validation summary
  generateValidationSummary(validation) {
    const issues = validation.errors.length + validation.warnings.length;
    if (issues === 0) {
      return 'All validations passed';
    }

    const errorCount = validation.errors.length;
    const warningCount = validation.warnings.length;

    let summary = '';
    if (errorCount > 0) {
      summary += `${errorCount} error${errorCount > 1 ? 's' : ''}`;
    }
    if (warningCount > 0) {
      if (summary) summary += ', ';
      summary += `${warningCount} warning${warningCount > 1 ? 's' : ''}`;
    }

    return `${issues} validation issue${issues > 1 ? 's' : ''} found: ${summary}`;
  }

  // Helper: Extract numeric value from currency string
  extractNumericValue(amount) {
    if (!amount || typeof amount !== 'string') return 0;

    // Handle European number format (1.234,56) vs US format (1,234.56)
    let cleaned = amount.replace(/[^\d.,\-]/g, ''); // Remove currency symbols and other non-numeric chars

    // Determine format based on currency context and number pattern
    // European format: 1.234,56 (period = thousands, comma = decimal)
    // US/UK format: 1,234.56 (comma = thousands, period = decimal)

    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Both separators present - need to determine which is which
      // Check if the comma comes after a period (European: 1.234,56)
      const lastPeriodIndex = cleaned.lastIndexOf('.');
      const lastCommaIndex = cleaned.lastIndexOf(',');

      if (lastCommaIndex > lastPeriodIndex) {
        // European format: remove periods, replace comma with dot
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // US/UK format: remove commas
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      // Only commas - could be decimal or thousands separators
      // If the comma is followed by 1-2 digits at the end, treat as decimal (European)
      // Otherwise, treat as thousands separator (US/UK)
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length <= 2 && /^\d+$/.test(parts[1])) {
        // European format: 1,23 -> 1.23
        cleaned = cleaned.replace(',', '.');
      } else {
        // US/UK format: remove commas as thousands separators
        cleaned = cleaned.replace(/,/g, '');
      }
    }
    // If only periods, assume US format and keep as is

    const match = cleaned.match(/[\d.]+\.?\d*/);
    return match ? parseFloat(match[0]) : 0;
  }

  // Helper: Extract currency symbol from amount string
  extractCurrencySymbol(amount) {
    if (!amount || typeof amount !== 'string') return null;

    // Look for common currency symbols
    const currencyMatch = amount.match(/([$€£¥]|CHF|Fr)/);
    return currencyMatch ? currencyMatch[0] : null;
  }

  // Helper: Validate currency format is reasonable
  isValidCurrencyFormat(amount) {
    if (!amount || typeof amount !== 'string') return false;

    // Basic validation for common currency formats
    const currencyPatterns = [
      /^\$[\d,]*\d+\.\d{2}$/,  // USD: $1,234.56 or $123.45
      /^€[\d.]*\d+,\d{2}$/,    // EUR: €1.234,56 or €1234,56 (before number)
      /^[\d.]*\d+,\d{2}\s*€$/, // EUR: 1.234,56 € or 1234,56 € (after number - French)
      /^[\d,]*\d+\.\d{2}\s*€$/, // EUR: 1,234.56 € or 123.45 € (after number - US format)
      /^£[\d,]*\d+\.\d{2}$/,  // GBP: £1,234.56
      /^¥[\d,]*\d+$/,         // JPY: ¥1234 (no decimals)
      /^CHF\s[\d,]*\d+(\.\d{2})?$/, // CHF: CHF 1234.56 or CHF 1234
      /^Fr\.?\s[\d,]*\d+(\.\d{2})?$/, // CHF French: Fr. 1234.56
      /^USD\s[\d,]*\d+(\.\d{2})?$/, // USD: USD 1234.56
      /^EUR\s[\d,]*\d+([,.]\d{2})?$/, // EUR: EUR 1234.56 or EUR 1234,56
      /^GBP\s[\d,]*\d+(\.\d{2})?$/, // GBP: GBP 1234.56
    ];

    return currencyPatterns.some(pattern => pattern.test(amount.trim()));
  }
}

module.exports = Validation;