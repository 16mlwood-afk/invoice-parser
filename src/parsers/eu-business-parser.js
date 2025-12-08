/**
 * EU Business Invoice Parser (Universal)
 *
 * Universal parser for Amazon EU business invoices across all languages
 * Handles the identical table-based format used in German, Spanish, French, Italian, and English
 * Structure: | Description | Quantity | Unit Price | Tax % | Unit Price | Total |
 */

const BaseParser = require('./base-parser');
const DateNormalizer = require('../utils/date-normalizer');

class EUBusinessParser extends BaseParser {
  constructor() {
    super('EU Business', 'EU-BUSINESS');
  }

  /**
   * Main extraction method for EU business invoices
   * @param {string} text - Preprocessed EU business invoice text
   * @param {Object} options - Extraction options
   * @returns {Object} - Extracted invoice data
   */
  extract(text, options = {}) {
    console.log('🏢 Using EU Business Parser');

    const items = this.extractBusinessItems(text);

    const rawInvoice = {
      orderNumber: this.extractOrderNumber(text),
      orderDate: this.extractOrderDate(text),
      items,
      subtotal: this.extractSubtotal(text) || this.calculateSubtotalFromItems(items),
      shipping: this.extractShipping(text),
      tax: this.extractTax(text),
      discount: this.extractDiscount(text),
      total: this.extractTotal(text),
      vendor: 'Amazon',
      format: 'amazon.eu',
      subtype: 'business',
      currency: 'EUR',
    };

    // Add format metadata from options if available
    if (options?.classification) {
      rawInvoice.formatClassification = options.classification;
    }

    // Validate against schema
    const { error, value } = this.invoiceSchema.validate(rawInvoice, {
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      console.warn('EU Business invoice validation warning:', error.details[0].message);
    }

    // Perform data validation
    const validationResult = this.validateInvoiceData(value);
    value.validation = validationResult;

    return value;
  }

  /**
   * Extract order number from EU business invoices (universal for all EU languages)
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order number or null
   */
  extractOrderNumber(text) {
    if (!text || typeof text !== 'string') return null;

    // Universal EU business order number patterns - all languages use same format
    const orderPatterns = [
      // German
      /Bestellnummer[:\s]*([A-Z0-9]{3}-\d{7}-\d{7})/i,
      /Bestell-Nr\.?[:\s]*([A-Z0-9]{3}-\d{7}-\d{7})/i,
      /Auftragsnummer[:\s]*([A-Z0-9]{3}-\d{7}-\d{7})/i,
      // Spanish
      /Número\s+de\s+pedido[:\s]*([A-Z0-9]{3}-\d{7}-\d{7})/i,
      /Nº\s+de\s+pedido[:\s]*([A-Z0-9]{3}-\d{7}-\d{7})/i,
      // French
      /Numéro\s+de\s+commande[:\s]*([A-Z0-9]{3}-\d{7}-\d{7})/i,
      /Nº\s+de\s+commande[:\s]*([A-Z0-9]{3}-\d{7}-\d{7})/i,
      // Italian
      /Numero\s+d'ordine[:\s]*([A-Z0-9]{3}-\d{7}-\d{7})/i,
      // English
      /Order\s*Number[:\s]*([A-Z0-9]{3}-\d{7}-\d{7})/i,
      /Order\s*#[:\s]*([A-Z0-9]{3}-\d{7}-\d{7})/i,
      // Fallback to standard format
      /(?<![-\d])([A-Z0-9]{3}-\d{7}-\d{7})(?![-\d])/,
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
   * Extract order date from EU business invoices (universal for all EU languages)
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Order date or null
   */
  extractOrderDate(text) {
    if (!text || typeof text !== 'string') return null;

    // Universal EU business date patterns for all languages
    const datePatterns = [
      // German
      /Bestelldatum[:\s]*([\d./-]+)/i,
      /Rechnungsdatum[:\s]*([\d./-]+)/i,
      /Datum[:\s]*([\d./-]+)/i,
      // Spanish
      /Fecha\s+de\s+pedido[:\s]*([\d./-]+)/i,
      /Fecha\s+de\s+compra[:\s]*([\d./-]+)/i,
      // French
      /Date\s+de\s+commande[:\s]*([\d./-]+)/i,
      /Date\s+d'achat[:\s]*([\d./-]+)/i,
      // Italian
      /Data\s+dell'ordine[:\s]*([\d./-]+)/i,
      /Data\s+di\s+acquisto[:\s]*([\d./-]+)/i,
      // English
      /Order\s+Date[:\s]*([\d./-]+)/i,
      /Purchase\s+Date[:\s]*([\d./-]+)/i,
      // Generic date patterns
      /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})\b/,
      /\b(\d{4}[/.-]\d{1,2}[/.-]\d{1,2})\b/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return DateNormalizer.normalize(match[1]);
      }
    }

    return null;
  }

  /**
   * Extract items from EU business invoices (universal table-based format)
   * All EU languages use identical table structure: | Description | Qty | Unit Price |
   * Tax % | Unit Price | Total |
   * @param {string} text - Preprocessed text
   * @returns {Array} - Array of extracted items
   */
  extractBusinessItems(text) {
    console.log('🔍 EU Business Parser: Extracting items (universal format)...');

    const items = [];
    const asinRegex = /ASIN:\s*([A-Z0-9]{10})/g;
    const asinMatches = [...text.matchAll(asinRegex)];

    console.log(`   Found ${asinMatches.length} ASIN codes`);

    for (const match of asinMatches) {
      const asin = match[1];
      const asinIndex = match.index;

      // Look BACKWARD - data comes before ASIN in table (universal across all EU languages)
      const textBefore = text.substring(
        Math.max(0, asinIndex - 600), // Increased search range
        asinIndex,
      );

      // Universal table pattern: | Description | Qty | Unit Price € | Tax % |
      // Unit Price € | Total € | - works for German, Spanish, French, Italian, English
      const dataMatch = textBefore.match(
        /\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*(\d+,\d{2})\s*€[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*(\d+,\d{2})\s*€\s*\|\s*$/, // eslint-disable-line max-len
      );

      if (dataMatch) {
        const [, description, qtyStr, unitPriceStr, totalStr] = dataMatch;
        const quantity = parseInt(qtyStr);
        const unitPrice = parseFloat(unitPriceStr.replace(',', '.'));
        const totalPrice = parseFloat(totalStr.replace(',', '.'));

        console.log(
          `   ✅ Extracted item: ${description.trim()} (${quantity}x ${unitPrice}€ = ${totalPrice}€)`, // eslint-disable-line max-len
        );

        items.push({
          asin,
          description: description.trim(),
          quantity,
          unitPrice,
          totalPrice,
          currency: 'EUR',
        });
      } else {
        // Try alternative pattern for some edge cases
        const altMatch = textBefore.match(
          /\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*[\d,]+\s*€\s*\|\s*\d+%?\s*\|\s*[\d,]+\s*€\s*\|\s*([\d,]+)\s*€\s*\|/, // eslint-disable-line max-len
        );

        if (altMatch) {
          const [, description, qtyStr, totalStr] = altMatch;
          const quantity = parseInt(qtyStr);
          const totalPrice = parseFloat(totalStr.replace(',', '.'));

          console.log(
            `   ✅ Extracted item (alt pattern): ${description.trim()} (${quantity}x items = ${totalPrice}€)`, // eslint-disable-line max-len
          );

          items.push({
            asin,
            description: description.trim(),
            quantity,
            unitPrice: totalPrice / quantity, // Calculate from total
            totalPrice,
            currency: 'EUR',
          });
        } else {
          console.log(`   ⚠️  No data match for ASIN ${asin}`);
          console.log(`   Text before ASIN: "...${textBefore.substring(textBefore.length - 150)}"`);
        }
      }
    }

    console.log(`   Total items extracted: ${items.length}`);
    return items;
  }

  /**
   * Extract subtotal from EU business invoices (universal for all EU languages)
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Subtotal or null
   */
  extractSubtotal(text) {
    if (!text || typeof text !== 'string') return null;

    // Universal EU business subtotal patterns
    const subtotalPatterns = [
      // German
      /Zwischensumme[:\s]*(\d+,\d{2})\s*€/i,
      /Teilsumme[:\s]*(\d+,\d{2})\s*€/i,
      /Nettobetrag[:\s]*(\d+,\d{2})\s*€/i,
      // Spanish
      /Subtotal[:\s]*(\d+,\d{2})\s*€/i,
      /Base\s+imponible[:\s]*(\d+,\d{2})\s*€/i,
      // French
      /Sous-total[:\s]*(\d+,\d{2})\s*€/i,
      /Total\s+HT[:\s]*(\d+,\d{2})\s*€/i,
      // Italian
      /Subtotale[:\s]*(\d+,\d{2})\s*€/i,
      /Totale\s+imponibile[:\s]*(\d+,\d{2})\s*€/i,
      // English
      /Subtotal[:\s]*(\d+,\d{2})\s*€/i,
      /Net\s+amount[:\s]*(\d+,\d{2})\s*€/i,
    ];

    for (const pattern of subtotalPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] + ' €';
      }
    }

    return null;
  }

  /**
   * Extract shipping from EU business invoices (universal for all EU languages)
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Shipping cost or null
   */
  extractShipping(text) {
    if (!text || typeof text !== 'string') return null;

    // Universal EU business shipping patterns
    const shippingPatterns = [
      // German
      /Versand[:\s]*(\d+,\d{2})\s*€/i,
      /Versandkosten[:\s]*(\d+,\d{2})\s*€/i,
      /Porto[:\s]*(\d+,\d{2})\s*€/i,
      // Spanish
      /Envío[:\s]*(\d+,\d{2})\s*€/i,
      /Gastos\s+de\s+envío[:\s]*(\d+,\d{2})\s*€/i,
      // French
      /Livraison[:\s]*(\d+,\d{2})\s*€/i,
      /Frais\s+de\s+port[:\s]*(\d+,\d{2})\s*€/i,
      // Italian
      /Spedizione[:\s]*(\d+,\d{2})\s*€/i,
      /Costi\s+di\s+spedizione[:\s]*(\d+,\d{2})\s*€/i,
      // English
      /Shipping[:\s]*(\d+,\d{2})\s*€/i,
      /Delivery[:\s]*(\d+,\d{2})\s*€/i,
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
   * Extract tax from EU business invoices (universal for all EU languages)
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Tax amount or null
   */
  extractTax(text) {
    if (!text || typeof text !== 'string') return null;

    // Universal EU business tax patterns
    const taxPatterns = [
      // German
      /MwSt[:\s]*(\d+,\d{2})\s*€/i,
      /Mehrwertsteuer[:\s]*(\d+,\d{2})\s*€/i,
      /Umsatzsteuer[:\s]*(\d+,\d{2})\s*€/i,
      // Spanish
      /IVA[:\s]*(\d+,\d{2})\s*€/i,
      /Impuesto\s+sobre\s+el\s+valor\s+añadido[:\s]*(\d+,\d{2})\s*€/i,
      // French
      /TVA[:\s]*(\d+,\d{2})\s*€/i,
      /Taxe\s+sur\s+la\s+valeur\s+ajoutée[:\s]*(\d+,\d{2})\s*€/i,
      // Italian
      /IVA[:\s]*(\d+,\d{2})\s*€/i,
      /Imposta\s+sul\s+valore\s+aggiunto[:\s]*(\d+,\d{2})\s*€/i,
      // English
      /VAT[:\s]*(\d+,\d{2})\s*€/i,
      /Tax[:\s]*(\d+,\d{2})\s*€/i,
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
   * Extract discount from EU business invoices (universal for all EU languages)
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Discount amount or null
   */
  extractDiscount(text) {
    if (!text || typeof text !== 'string') return null;

    // Universal EU business discount patterns
    const discountPatterns = [
      // German
      /Rabatt[:\s]*(-?\d+,\d{2})\s*€/i,
      /Nachlass[:\s]*(-?\d+,\d{2})\s*€/i,
      /Ermäßigung[:\s]*(-?\d+,\d{2})\s*€/i,
      // Spanish
      /Descuento[:\s]*(-?\d+,\d{2})\s*€/i,
      /Rebaja[:\s]*(-?\d+,\d{2})\s*€/i,
      // French
      /Remise[:\s]*(-?\d+,\d{2})\s*€/i,
      /Réduction[:\s]*(-?\d+,\d{2})\s*€/i,
      // Italian
      /Sconto[:\s]*(-?\d+,\d{2})\s*€/i,
      /Riduzione[:\s]*(-?\d+,\d{2})\s*€/i,
      // English
      /Discount[:\s]*(-?\d+,\d{2})\s*€/i,
      /Reduction[:\s]*(-?\d+,\d{2})\s*€/i,
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
   * Extract total from EU business invoices (universal for all EU languages)
   * @param {string} text - Preprocessed text
   * @returns {string|null} - Total amount or null
   */
  extractTotal(text) {
    if (!text || typeof text !== 'string') return null;

    // Universal EU business total patterns
    const totalPatterns = [
      // German
      /Gesamtbetrag[:\s]*(\d+,\d{2})\s*€/i,
      /Gesamtpreis[:\s]*(\d+,\d{2})\s*€/i,
      /Gesamtsumme[:\s]*(\d+,\d{2})\s*€/i,
      /Bruttobetrag[:\s]*(\d+,\d{2})\s*€/i,
      /Endbetrag[:\s]*(\d+,\d{2})\s*€/i,
      // Spanish
      /Total[:\s]*(\d+,\d{2})\s*€/i,
      /Importe\s+total[:\s]*(\d+,\d{2})\s*€/i,
      // French
      /Total[:\s]*(\d+,\d{2})\s*€/i,
      /Montant\s+total[:\s]*(\d+,\d{2})\s*€/i,
      /Total\s+TTC[:\s]*(\d+,\d{2})\s*€/i,
      // Italian
      /Totale[:\s]*(\d+,\d{2})\s*€/i,
      /Importo\s+totale[:\s]*(\d+,\d{2})\s*€/i,
      // English
      /Total[:\s]*(\d+,\d{2})\s*€/i,
      /Grand\s+total[:\s]*(\d+,\d{2})\s*€/i,
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

module.exports = EUBusinessParser;
