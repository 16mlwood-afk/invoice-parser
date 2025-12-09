/**
 * EU Consumer Invoice Parser
 *
 * Specialized parser for Amazon EU consumer invoices
 * Handles line-based format where item data appears after ASIN
 */

const BaseParser = require('./base-parser');
const DateNormalizer = require('../utils/date-normalizer');

class EUConsumerParser extends BaseParser {
  constructor() {
    super('EU Consumer', 'EU-CONSUMER');
  }

  /**
   * Detect language from EU invoice text
   * @param {string} text - Invoice text
   * @returns {string} - Language code (de, fr, es, it, en)
   */
  detectLanguage(text) {
    if (!text || typeof text !== 'string') return 'en';

    // Language detection patterns for EU invoices
    const languagePatterns = {
      'de': [/amazon\.de/i, /Bestelldatum/i, /Gesamtbetrag/i, /MwSt/i, /Versandkosten/i],
      'fr': [/amazon\.fr/i, /Date\s+de\s+commande/i, /Total\s+TTC/i, /TVA/i, /Frais\s+de\s+port/i],
      'es': [/amazon\.es/i, /Fecha\s+de\s+pedido/i, /Total/i, /IVA/i, /Gastos\s+de\s+envío/i],
      'it': [/amazon\.it/i, /Data\s+dell'ordine/i, /Totale/i, /IVA/i, /Costi\s+di\s+spedizione/i],
      'en': [/amazon\.co\.uk/i, /Order\s+Date/i, /Total/i, /VAT/i, /Delivery/i]
    };

    // Score each language
    const scores = {};
    for (const [lang, patterns] of Object.entries(languagePatterns)) {
      scores[lang] = patterns.reduce((score, pattern) => {
        return score + (pattern.test(text) ? 1 : 0);
      }, 0);
    }

    // Return language with highest score
    const bestLang = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b);
    return bestLang[1] > 0 ? bestLang[0] : 'en';
  }

  /**
   * Main extraction method for EU consumer invoices
   * @param {string} text - Preprocessed EU consumer invoice text
   * @param {Object} options - Extraction options
   * @returns {Object} - Extracted invoice data
   */
  extract(text, options = {}) {
    console.log('🛒 Using EU Consumer Parser');

    const items = this.extractConsumerItems(text);

      const rawInvoice = {
        orderNumber: this.extractOrderNumber(text),
        orderDate: this.extractOrderDate(text),
        items: items,
        subtotal: this.calculateSubtotalFromItems(items) || this.extractSubtotal(text) || this.calculateSubtotalFromTotal(text),
        shipping: this.extractShipping(text),
        tax: this.extractTax(text),
        discount: this.extractDiscount(text),
        total: this.extractTotal(text),
        vatRate: this.extractVatRate(text),
        shippingAddress: this.extractShippingAddress(text),
        billingAddress: this.extractBillingAddress(text),
        paymentMethod: this.extractPaymentMethod(text),
        vendor: 'Amazon',
        format: 'amazon.eu',
        subtype: 'consumer',
        currency: 'EUR'
      };

    // Add format metadata from options if available
    if (options?.classification) {
      rawInvoice.formatClassification = options.classification;
    }

    // Add confidence scores for extracted fields
    rawInvoice.confidenceScores = {
      orderNumber: this.calculateConfidence(rawInvoice.orderNumber),
      orderDate: this.calculateConfidence(rawInvoice.orderDate),
      subtotal: this.calculateConfidence(rawInvoice.subtotal, false, rawInvoice.subtotal && rawInvoice.subtotal.includes('calculated')),
      shipping: this.calculateConfidence(rawInvoice.shipping),
      tax: this.calculateConfidence(rawInvoice.tax),
      discount: this.calculateConfidence(rawInvoice.discount),
      total: this.calculateConfidence(rawInvoice.total),
      vatRate: rawInvoice.vatRate ? 85 : 0, // VAT rate has high confidence if found
      shippingAddress: rawInvoice.shippingAddress ? 75 : 0,
      billingAddress: rawInvoice.billingAddress ? 75 : 0,
      paymentMethod: this.calculateConfidence(rawInvoice.paymentMethod),
      overall: 0 // Will be calculated below
    };

    // Calculate overall confidence based on critical fields
    const criticalFields = ['orderNumber', 'orderDate', 'total'];
    const criticalConfidence = criticalFields.reduce((sum, field) =>
      sum + (rawInvoice.confidenceScores[field] || 0), 0) / criticalFields.length;
    rawInvoice.confidenceScores.overall = Math.round(criticalConfidence);

    // Validate against schema
    const { error, value } = this.invoiceSchema.validate(rawInvoice, {
      stripUnknown: true,
      convert: true
    });

    if (error) {
      console.warn('EU Consumer invoice validation warning:', error.details[0].message);
    }

    // Perform data validation
    const validationResult = this.validateInvoiceData(value);
    value.validation = validationResult;

    return value;
  }

  /**
   * Extract order number from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order number or null
   */
  extractOrderNumber(text) {
    if (!text || typeof text !== 'string') return null;

    // EU consumer order number patterns
    const orderPatterns = [
      /Bestellnummer[:\s]*([A-Z0-9]{3}-\d{7}-\d{7})/i,
      /Order\s*Number[:\s]*(\d{3}-\d{7}-\d{7})/i,
      /Order\s*#\s*(\d{3}-\d{7}-\d{7})/i,
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
   * Extract order date from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order date or null
   */
  extractOrderDate(text) {
    if (!text || typeof text !== 'string') return null;

    // Detect language for proper date normalization
    const language = this.detectLanguage(text);

    // EU consumer date patterns
    const datePatterns = [
      /Bestelldatum(\d+\s+\w+\s+\d+)/i,  // "Bestelldatum28 November 2025" (most specific)
      /Bestelldatum([\d.\/-]+)/i,         // "Bestelldatum24.08.2025" (concatenated)
      /Bestelldatum[:\s]*([\d.\/-]+)/i,  // "Bestelldatum: 28.11.2025" (fallback)
      /Order\s+Date[:\s]*([\d.\/-]+)/i,
      /Datum[:\s]*([\d.\/-]+)/i,
      /Rechnungsdatum[:\s]*([\d.\/-]+)/i,
      // Additional patterns for concatenated dates
      /Bestelldatum(\d{1,2}\.\d{1,2}\.\d{4})/i,  // "Bestelldatum24.08.2025"
      /Bestelldatum(\d{1,2}\/\d{1,2}\/\d{4})/i,   // "Bestelldatum24/08/2025"
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return DateNormalizer.normalize(match[1], language);
      }
    }

    return null;
  }

  /**
   * Extract items from EU consumer invoices (table-based format)
   * @param {string} text - Preprocessed text
   * @returns {Array} - Array of extracted items
   */
  extractConsumerItems(text) {
    const items = [];
    const asinRegex = /ASIN:\s*([A-Z0-9]{10})/g;

    for (const match of text.matchAll(asinRegex)) {
      const asin = match[1];
      const asinIndex = match.index;

      // Look BACKWARD for description (table format)
      const textBefore = text.substring(
        Math.max(0, asinIndex - 600),
        asinIndex
      );

      // Extract description from the line immediately before ASIN
      const linesBefore = textBefore.split('\n');
      let description = '';
      for (let i = linesBefore.length - 1; i >= 0; i--) {
        const line = linesBefore[i].trim();
        if (line && !line.includes('ASIN:') && line.length > 10) {
          description = line;
          break;
        }
      }

      // Look at the ASIN line itself and lines after for pricing data (table format)
      const textAfter = text.substring(asinIndex, asinIndex + 300);

      // Parse the table structure more intelligently
      // EU Consumer format: Description | ASIN | UnitPriceHT € | Tax% | UnitPriceTTC € | TotalTTC €
      const lines = textAfter.split('\n').slice(0, 6); // ASIN line and next 5 lines

      // Look for the pricing pattern in the lines
      let unitPrice = null;
      let totalPrice = null;
      let taxRate = null;

      // Find the line with pricing data (should be the first line with € amounts)
      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip lines that are just numbers/symbols or tax percentages
        if (/^\d+\s*%?$/.test(trimmedLine) || trimmedLine.length < 3) {
          if (/^\d+\s*%?$/.test(trimmedLine)) {
            taxRate = parseInt(trimmedLine);
          }
          continue;
        }

        // Look for euro amounts in this line
        const euroMatches = [...trimmedLine.matchAll(/(\d+,\d{2})\s*€/g)];

        if (euroMatches.length > 0) {
          const amounts = euroMatches.map(match => parseFloat(match[1].replace(',', '.')));

          // If we have amounts and haven't set prices yet
          if (!unitPrice && !totalPrice) {
            // Check for OCR corruption (prices > €2000 that are likely merged quantities, or suspicious ratios)
            const hasCorruptedPrices = amounts.some(amount => amount > 2000);
            const hasSuspiciousRatio = amounts.length > 1 && amounts[0] > amounts[1] * 3; // First amount much larger than second

            if ((hasCorruptedPrices || hasSuspiciousRatio) && amounts.length > 1) {
              // Use the most reasonable price (skip obviously corrupted first amount)
              const realisticAmounts = amounts.filter(amount => amount <= 1000);
              if (realisticAmounts.length > 0) {
                unitPrice = realisticAmounts[0];
                totalPrice = realisticAmounts[0];
              } else {
                // All amounts corrupted, use smallest
                unitPrice = Math.min(...amounts);
                totalPrice = Math.min(...amounts);
              }
            } else {
              // Normal case - use original logic
              if (amounts.length === 1) {
                // Single amount - in consumer invoices, this is usually the total price
                // But we need to check if this is part of a multi-line table format
                // Look ahead to see if there are more pricing lines
                const currentIndex = lines.indexOf(line);
                const nextLines = lines.slice(currentIndex + 1, currentIndex + 3);

                // Check if next lines have additional pricing data
                let allAmounts = [...amounts];
                for (const nextLine of nextLines) {
                  const nextMatches = [...nextLine.trim().matchAll(/(\d+,\d{2})\s*€/g)];
                  if (nextMatches.length > 0) {
                    const nextAmounts = nextMatches.map(match => parseFloat(match[1].replace(',', '.')));
                    allAmounts.push(...nextAmounts);
                  }
                }

                if (allAmounts.length >= 3) {
                  // Multi-line table format found - use second amount (inc-VAT price)
                  unitPrice = allAmounts[1]; // VAT-inclusive unit price
                  const potentialTotal = allAmounts[allAmounts.length - 1]; // Last amount

                  // Check if the last amount is unreasonably high (likely a subtotal, not item total)
                  if (potentialTotal > unitPrice * 2) {
                    totalPrice = unitPrice; // For qty=1, they should be equal
                  } else {
                    totalPrice = potentialTotal;
                  }
                } else if (allAmounts.length === 2) {
                  // Two amounts found across lines - check for OCR corruption
                  const hasCorruptedPrices = allAmounts.some(amount => amount > 2000);
                  const hasSuspiciousRatio = allAmounts[0] > allAmounts[1] * 3;

                  if (hasCorruptedPrices || hasSuspiciousRatio) {
                    // Use the more reasonable second amount
                    unitPrice = allAmounts[1];
                    totalPrice = allAmounts[1];
                  } else {
                    // Normal case - use second amount (typical consumer format)
                    unitPrice = allAmounts[1];
                    totalPrice = allAmounts[1];
                  }
                } else {
                  // Single amount line - use as total price
                  totalPrice = amounts[0];
                  unitPrice = amounts[0]; // For consumer invoices, unit price = total price
                }
              } else if (amounts.length >= 3) {
                // EU Consumer format: ex-VAT price | VAT% | inc-VAT price | total inc-VAT
                // Example: 149,99 € 20% 59,99 € 59,99 €
                // amounts: [149.99, 59.99, 59.99]
                // Use the second amount (inc-VAT unit price)
                unitPrice = amounts[1]; // VAT-inclusive unit price
                totalPrice = amounts[amounts.length - 1]; // Last amount is total TTC
              } else if (amounts.length === 2) {
                // Fallback for 2 amounts - assume second is the correct price
                unitPrice = amounts[1];
                totalPrice = amounts[1];
              }
            }
          }
          break; // Found pricing data, stop looking
        }
      }

      // Only create item if we have pricing data
      if (unitPrice && totalPrice) {
        const quantity = 1; // Consumer invoices typically have quantity 1

        items.push({
          asin,
          description: description.trim(),
          quantity,
          unitPrice,
          totalPrice,
          currency: 'EUR'
        });
      }
    }

    return items;
  }

  /**
   * Extract subtotal from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Subtotal or null
   */
  extractSubtotal(text) {
    if (!text || typeof text !== 'string') return null;

    const subtotalPatterns = [
      /Zwischensumme[:\s]*€?([\d.]+,\d{2})/i,
      /Subtotal[:\s]*€?([\d.]+,\d{2})/i,
      /Nettobetrag[:\s]*€?([\d.]+,\d{2})/i,
      // Handle formats without colons
      /Zwischensumme([\d.]+,\d{2})\s*€/i,
      /Subtotal([\d.]+,\d{2})\s*€/i,
      // Extract from tax summary: "USt. Gesamt101,81 €20,38 €" (subtotal without tax)
      /USt\. Gesamt([\d.]+,\d{2})\s*€/i,
      /USt\. Gesamt[\d.]+,\d{2}\s*€\s*([\d.]+,\d{2})\s*€/i,
      // Handle table format subtotals
      /Gesamt([\d.]+,\d{2})\s*€/i,
      /Gesamtpreis([\d.]+,\d{2})\s*€/i,
      /Total\s+HT[:\s]*([\d.]+,\d{2})\s*€/i,
    ];

    for (const pattern of subtotalPatterns) {
      const match = text.match(pattern);
      if (match) {
        // For tax summary format, the subtotal is the first amount
        if (pattern.source.includes('USt\\. Gesamt') && match.length > 2) {
          return match[1] + ' €'; // First amount is subtotal without tax
        }
        return match[1] + ' €';
      }
    }

    return null;
  }

  /**
   * Calculate subtotal from total - tax - shipping (fallback method)
   * @param {string} text - Invoice text
   * @returns {string|null} - Calculated subtotal or null
   */
  calculateSubtotalFromTotal(text) {
    const total = this.extractTotal(text);
    const tax = this.extractTax(text);
    const shipping = this.extractShipping(text) || '0 €';

    if (!total) return null;

    try {
      const totalValue = this.extractNumericValue(total);
      const taxValue = tax ? this.extractNumericValue(tax) : 0;
      const shippingValue = this.extractNumericValue(shipping);

      if (!isNaN(totalValue) && !isNaN(taxValue) && !isNaN(shippingValue)) {
        const subtotalValue = totalValue - taxValue - shippingValue;

        // Validate the calculation makes sense (subtotal should be positive and reasonable)
        if (subtotalValue > 0 && subtotalValue <= totalValue) {
          return subtotalValue.toFixed(2).replace('.', ',') + ' €';
        }
      }
    } catch (error) {
      console.warn('Subtotal calculation failed:', error.message);
    }

    return null;
  }

  /**
   * Extract shipping from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Shipping cost or null
   */
  extractShipping(text) {
    if (!text || typeof text !== 'string') return null;

    const shippingPatterns = [
      /Versandkosten[:\s]*€?(\d+,\d{2})/i,
      /Versand[:\s]*€?(\d+,\d{2})/i,
      /Shipping[:\s]*€?(\d+,\d{2})/i,
      /Delivery[:\s]*€?(\d+,\d{2})/i,
      // Handle concatenated formats
      /Versandkosten(\d+,\d{2})\s*€/i,
      /Versand(\d+,\d{2})\s*€/i,
    ];

    for (const pattern of shippingPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] + ' €';
      }
    }

    return null;
  }

  /**
   * Extract tax from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Tax amount or null
   */
  extractTax(text) {
    if (!text || typeof text !== 'string') return null;

    const taxPatterns = [
      /USt\. Gesamt[\d.]+,\d{2} €([\d.]+,\d{2})/i,  // "USt. Gesamt266,24 €0,00 €"
      /\d+%[\d.]+,\d{2} €([\d.]+,\d{2})/i,          // "0%266,24 €0,00 €"
      /MwSt[:\s]*€?([\d.]+,\d{2})/i,
      /VAT[:\s]*€?([\d.]+,\d{2})/i,
      /Steuer[:\s]*€?([\d.]+,\d{2})/i,
      /USt[:\s]*€?([\d.]+,\d{2})/i,
      // Handle table format with percentage
      /\d+%([\d.]+,\d{2})\s*€/i,
      // Handle concatenated formats
      /MwSt([\d.]+,\d{2})\s*€/i,
      // Extract from tax summary: "USt. Gesamt1.588,22 €0,00 €" (tax amount is second)
      /USt\. Gesamt[\d.]+,\d{2}\s*€\s*([\d.]+,\d{2})\s*€/i,
    ];

    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] + ' €';
      }
    }

    return null;
  }

  /**
   * Extract VAT rate from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {number|null} - VAT rate as percentage or null
   */
  extractVatRate(text) {
    if (!text || typeof text !== 'string') return null;

    const vatRatePatterns = [
      // "19% MwSt" or "19% VAT"
      /(\d+(?:[.,]\d+)?)%\s*(?:MwSt|VAT|USt|TVA|IVA)/i,
      // "MwSt 19%" or "VAT 19%"
      /(?:MwSt|VAT|USt|TVA|IVA)\s*(\d+(?:[.,]\d+)?)%/i,
      // From tax summary: "19%266,24 €53,25 €"
      /(\d+(?:[.,]\d+)?)%[\d.]+,\d{2}\s*€[\d.]+,\d{2}/i,
      // Table format: "19% 53,25 €"
      /(\d+(?:[.,]\d+)?)%\s*[\d.]+,\d{2}\s*€/i,
    ];

    for (const pattern of vatRatePatterns) {
      const match = text.match(pattern);
      if (match) {
        const rate = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(rate) && rate >= 0 && rate <= 100) {
          return rate;
        }
      }
    }

    return null;
  }

  /**
   * Extract shipping address from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {Object|null} - Shipping address object or null
   */
  extractShippingAddress(text) {
    if (!text || typeof text !== 'string') return null;

    const shippingPatterns = [
      // German: "Lieferadresse" followed by address lines
      /Lieferadresse[\s\S]*?(?=Versand|Rechnung|Bestellung|$)/i,
      // French: "Adresse de livraison"
      /Adresse\s+de\s+livraison[\s\S]*?(?=Expédition|Facturation|Commande|$)/i,
      // English: "Shipping Address"
      /Shipping\s+Address[\s\S]*?(?=Shipping|Billing|Order|$)/i,
      // Generic: Look for address patterns after shipping keywords
      /(?:Versand|Livraison|Shipping)[\s\S]*?(\d{5}[\s\S]*?)(?:\n\n|\n[A-Z]|$)/i,
    ];

    for (const pattern of shippingPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const addressText = match[1].trim();
        // Parse address lines
        const lines = addressText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        if (lines.length >= 2) {
          return {
            name: lines[0],
            street: lines.slice(1, -2).join(', '),
            city: lines[lines.length - 2] || '',
            postalCode: lines[lines.length - 1]?.match(/\d{5}/)?.[0] || '',
            country: 'Germany' // Default for EU consumer, could be enhanced
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract billing address from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {Object|null} - Billing address object or null
   */
  extractBillingAddress(text) {
    if (!text || typeof text !== 'string') return null;

    const billingPatterns = [
      // German: "Rechnungsadresse"
      /Rechnungsadresse[\s\S]*?(?=Liefer|Versand|Bestellung|$)/i,
      // French: "Adresse de facturation"
      /Adresse\s+de\s+facturation[\s\S]*?(?=Livraison|Expédition|Commande|$)/i,
      // English: "Billing Address"
      /Billing\s+Address[\s\S]*?(?=Shipping|Order|$)/i,
    ];

    for (const pattern of billingPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const addressText = match[1].trim();
        const lines = addressText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        if (lines.length >= 2) {
          return {
            name: lines[0],
            street: lines.slice(1, -2).join(', '),
            city: lines[lines.length - 2] || '',
            postalCode: lines[lines.length - 1]?.match(/\d{5}/)?.[0] || '',
            country: 'Germany'
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract payment method from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Payment method or null
   */
  extractPaymentMethod(text) {
    if (!text || typeof text !== 'string') return null;

    const paymentPatterns = [
      /Zahlungsart[:\s]*([^\n\r]+)/i,
      /Payment\s+Method[:\s]*([^\n\r]+)/i,
      /Mode\s+de\s+paiement[:\s]*([^\n\r]+)/i,
      /Zahlung[:\s]*([^\n\r]+)/i,
    ];

    for (const pattern of paymentPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Calculate confidence score for extracted field
   * @param {string|null} extractedValue - The extracted value
   * @param {boolean} hasMultipleMatches - Whether multiple patterns matched
   * @param {boolean} isCalculated - Whether value was calculated vs directly extracted
   * @returns {number} - Confidence score (0-100)
   */
  calculateConfidence(extractedValue, hasMultipleMatches = false, isCalculated = false) {
    if (!extractedValue) return 0;

    let confidence = 70; // Base confidence for successful extraction

    if (hasMultipleMatches) confidence += 15; // Multiple pattern matches increase confidence
    if (isCalculated) confidence -= 20; // Calculated values have lower confidence

    // Length-based confidence (reasonable length suggests better extraction)
    if (typeof extractedValue === 'string') {
      if (extractedValue.length > 50) confidence -= 10; // Very long strings might be wrong
      if (extractedValue.length < 3) confidence -= 15; // Very short strings suspicious
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Extract discount from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Discount amount or null
   */
  extractDiscount(text) {
    if (!text || typeof text !== 'string') return null;

    const discountPatterns = [
      /Rabatt[:\s]*(-?\d+,\d{2})\s*€/i,
      /Discount[:\s]*(-?\d+,\d{2})\s*€/i,
    ];

    for (const pattern of discountPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] + ' €';
      }
    }

    return null;
  }

  /**
   * Extract total from EU consumer invoices
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Total amount or null
   */
  extractTotal(text) {
    if (!text || typeof text !== 'string') return null;

    const totalPatterns = [
      /Gesamtpreis[:\s]*€?([\d.]+,\d{2})/i,
      /Zahlbetrag[:\s]*€?([\d.]+,\d{2})/i,
      /Gesamtbetrag[:\s]*€?([\d.]+,\d{2})/i,
      /Total[:\s]*€?([\d.]+,\d{2})/i,
      /Gesamt[:\s]*€?([\d.]+,\d{2})/i,
      // Handle concatenated formats
      /Gesamtpreis([\d.]+,\d{2})\s*€/i,
      /Zahlbetrag([\d.]+,\d{2})\s*€/i,
      /Gesamtbetrag([\d.]+,\d{2})\s*€/i,
    ];

    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] + ' €';
      }
    }

    return null;
  }
}

module.exports = EUConsumerParser;