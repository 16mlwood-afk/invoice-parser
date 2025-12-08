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
    try {
      console.log('🏢 Using EU Business Parser');

      const items = this.extractBusinessItems(text);
      console.log('📊 Extracted ' + items.length + ' items');

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
    } catch (error) {
      console.error('❌ EU Business Parser failed:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
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

    console.log('   Found ' + asinMatches.length + ' ASIN codes');

    // Track processed positions to prevent overlapping extractions
    const processedPositions = new Set();

    for (const match of asinMatches) {
      const asin = match[1];
      const asinIndex = match.index;

      // Skip if we've already processed nearby text (prevents overlapping extractions)
      if (processedPositions.has(asinIndex)) {
        console.log('   ⏭️  Skipping ASIN ' + asin + ' (already processed nearby)');
        continue;
      }

      // Look BACKWARD - data comes before ASIN in table (universal across all EU languages)
      const textBefore = text.substring(
        Math.max(0, asinIndex - 600), // Increased search range
        asinIndex,
      );

      // ========== NEW PATTERN: Concatenated PDF Table Columns ==========

      // PDF parser concatenates table columns without spacing

      // Format: [QTY+PRICE]€ → Tax% → (1) → [UNITPRICE]€[TOTAL]€

      // Example: "537,37 €" means qty=5, price=37.37

      //          "37,37 €186,85 €" means unitPrice=37.37, total=186.85

      const textAfterAsin = text.substring(
        asinIndex + match[0].length,
        Math.min(text.length, asinIndex + match[0].length + 400)
      );

      // Look for the concatenated pattern in the lines after ASIN
      const concatenatedMatch = textAfterAsin.match(
        /^[^\n]*\n\s*(\d{1,4})(,\d{2})\s*€\s*\n\s*\d+\s*%\s*\n\s*\((\d+)\)\s*\n\s*(\d+,\d{2})\s*€\s*(\d+,\d{2})\s*€/
      );

      if (concatenatedMatch) {
        const [, qtyDigits, priceDecimals, parenNumber, unitPriceStr, totalStr] = concatenatedMatch;

        // Extract quantity from first digits of concatenated number
        let quantity = parseInt(qtyDigits);
        const unitPrice = parseFloat(unitPriceStr.replace(',', '.'));
        const totalPrice = parseFloat(totalStr.replace(',', '.'));

        // Validate and correct quantity using math
        const calculatedQty = Math.round(totalPrice / unitPrice);
        if (calculatedQty >= 1 && calculatedQty <= 100 &&
            Math.abs(calculatedQty * unitPrice - totalPrice) < 0.10) {
          quantity = calculatedQty;
        }

        // Get description from BEFORE ASIN
        const descLines = textBefore
          .split('\n')
          .filter(l => l.trim().length > 20)
          .filter(l => !l.includes('ASIN:'))
          .filter(l => !/^\d+\s*[:.]?\s*$/.test(l))
          .filter(l => !/(Bestellung|Artikel|Produkt|Summe|Total|Menge|Stückpreis)/i.test(l));

        const description = descLines[descLines.length - 1]?.trim() || 'Product';

        console.log(
          `   ✅ Extracted (concatenated format): ${description.substring(0, 40)}... ` +
          `(${quantity}x ${unitPrice}€ = ${totalPrice}€)`
        );

        items.push({
          asin,
          description,
          quantity,
          unitPrice,
          totalPrice,
          currency: 'EUR',
        });

        // Mark position as processed - only mark the exact matched text
        // Find the exact position of the concatenated match in the full text
        const fullMatchIndex = text.indexOf(concatenatedMatch[0], asinIndex + match[0].length);
        if (fullMatchIndex !== -1) {
          // Mark only the exact matched text as processed
          const matchLength = concatenatedMatch[0].length;
          for (let i = fullMatchIndex; i < fullMatchIndex + matchLength; i++) {
            processedPositions.add(i);
          }
        }

        continue; // Skip to next ASIN
      }

      // Universal table pattern: | Description | Qty | Unit Price € | Tax % |
      // Unit Price € | Total € | - works for German, Spanish, French, Italian, English
      const dataMatch = textBefore.match(
        /\|\s*([^|]+?)\s*\|\s*(\d{1,3})\s*\|\s*(\d+,\d{2})\s*€[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*(\d+,\d{2})\s*€\s*\|\s*$/, // eslint-disable-line max-len
      );

      if (dataMatch) {
        const [, description, qtyStr, unitPriceStr, totalStr] = dataMatch;
        const quantity = parseInt(qtyStr);
        const unitPrice = parseFloat(unitPriceStr.replace(',', '.'));
        const totalPrice = parseFloat(totalStr.replace(',', '.'));


        console.log(
          '   ✅ Extracted item: ' + description.trim() + ' (' + quantity + 'x ' + unitPrice + '€ = ' + totalPrice + '€)', // eslint-disable-line max-len
        );

        items.push({
          asin,
          description: description.trim(),
          quantity,
          unitPrice,
          totalPrice,
          currency: 'EUR',
        });

        // Mark this position as processed to prevent overlapping extractions
        for (let i = Math.max(0, asinIndex - 1000); i < asinIndex + 1000; i++) {
          processedPositions.add(i);
        }
      } else {
        // Try German table format: Description | Menge | Stückpreis | USt% | Stückpreis | Zwischensumme
        // Pattern: [Description] [Quantity] [UnitPrice €] [Tax%] [(Qty)] [UnitPrice €] [Total €]
        const germanTableMatch = textBefore.match(
          /([^\n\r]{20,400}?)\s+(\d{1,3})\s+(\d+,\d{2})\s*€\s+\d+%?\s*\(\d+\)\s+(\d+,\d{2})\s*€\s+(\d+,\d{2})\s*€/s
        );

        if (germanTableMatch) {
          const [, description, qtyStr, unitPriceStr, totalStr] = germanTableMatch;
          let quantity = parseInt(qtyStr);
          const unitPrice = parseFloat(unitPriceStr.replace(',', '.'));
          const totalPrice = parseFloat(totalStr.replace(',', '.'));

          // Calculate quantity from total ÷ unitPrice as validation/fallback
          if (unitPrice && totalPrice) {
            const calculatedQty = Math.round(totalPrice / unitPrice);
            if (calculatedQty >= 1 && calculatedQty <= 100 && Math.abs(calculatedQty * unitPrice - totalPrice) < 0.10) {
              quantity = calculatedQty;
              console.log(`   📊 Corrected quantity using total÷price: ${calculatedQty} (${totalPrice}€ ÷ ${unitPrice}€)`);
            }
          }

          // Validate that description looks like a product name
          const cleanDescription = description.trim();
          if (cleanDescription.length < 10 ||
              /^\d+\s*[:.]?\s*$/.test(cleanDescription) ||
              /\b(Bestellung|Artikel|Produkt|Summe|Total|Gesamt)\b/i.test(cleanDescription)) {
            console.log('   ⚠️  Skipping likely header text (table): "' + cleanDescription + '"');
          } else {
            console.log(
              '   ✅ Extracted German table item: ' + cleanDescription + ' (' + quantity + 'x ' + unitPrice + '€ = ' + totalPrice + '€)',
            );

            items.push({
              asin,
              description: cleanDescription,
              quantity,
              unitPrice,
              totalPrice,
              currency: 'EUR',
            });

            // Mark this position as processed to prevent overlapping extractions
            for (let i = Math.max(0, asinIndex - 1000); i < asinIndex + 1000; i++) {
              processedPositions.add(i);
            }
            continue; // Skip to next ASIN
          }
        }

        // Try German-specific pattern (no pipes) - look for product description immediately before ASIN
        // Look for pattern: [Product Name] [ASIN] [Price] [Tax%] [Quantity] [Total]
        const germanMatch = textBefore.match(
          /([^\n\r]{10,200}?)\s*\n\s*ASIN:\s*[A-Z0-9]{10}\s*\n\s*(\d+,\d{2})\s*€\s*\n\s*(\d+,\d{2})\s*€(\d+,\d{2})\s*€/s
        );

        if (germanMatch) {
          const [, description, unitPriceStr, taxInclPriceStr, totalStr] = germanMatch;
          let quantity = 1; // German format seems to have individual entries (quantity not always clear)
          const unitPrice = parseFloat(unitPriceStr.replace(',', '.'));
          const totalPrice = parseFloat(totalStr.replace(',', '.'));

          // Calculate quantity from total ÷ unitPrice as validation/fallback
          if (unitPrice && totalPrice) {
            const calculatedQty = Math.round(totalPrice / unitPrice);
            if (calculatedQty >= 1 && calculatedQty <= 100 && Math.abs(calculatedQty * unitPrice - totalPrice) < 0.10) {
              quantity = calculatedQty;
              console.log(`   📊 Corrected quantity using total÷price: ${calculatedQty} (${totalPrice}€ ÷ ${unitPrice}€)`);
            }
          }

          // Validate that description looks like a product name (not header text)
          const cleanDescription = description.trim();
          // Skip if description looks like header text (too short, contains only numbers/symbols, or header keywords)
          if (cleanDescription.length < 10 ||
              /^\d+\s*[:.]?\s*$/.test(cleanDescription) ||
              /\b(Bestellung|Artikel|Produkt|Summe|Total|Gesamt)\b/i.test(cleanDescription)) {
            console.log('   ⚠️  Skipping likely header text: "' + cleanDescription + '"');
          } else {
            console.log(
              '   ✅ Extracted German item: ' + cleanDescription + ' (' + quantity + 'x ' + unitPrice + '€ = ' + totalPrice + '€)',
            );

            items.push({
              asin,
              description: cleanDescription,
              quantity,
              unitPrice,
              totalPrice,
              currency: 'EUR',
            });

            // Mark this position as processed to prevent overlapping extractions
            for (let i = Math.max(0, asinIndex - 1000); i < asinIndex + 1000; i++) {
              processedPositions.add(i);
            }
          }
        } else {
          // Try alternative German-specific pattern with tax percentage and quantity in parentheses
          let germanMatchAlt = textBefore.match(
            /([^\n\r]{10,200}?)\s*\n\s*ASIN:\s*[A-Z0-9]{10}\s*\n\s*(\d+,\d{2})\s*€\s*\n\s*\d+%?\s*\n\s*\((\d+)\)\s*\n\s*(\d+,\d{2})\s*€(\d+,\d{2})\s*€/s
          );

          // More flexible German pattern - try without the extra price column
          if (!germanMatchAlt) {
            germanMatchAlt = textBefore.match(
              /([^\n\r]{10,300}?)\s*\n\s*ASIN:\s*[A-Z0-9]{10}\s*\n\s*(\d+,\d{2})\s*€\s*\n\s*\d+%?\s*\n\s*\((\d+)\)\s*\n\s*(\d+,\d{2})\s*€/s
            );
          }

          // Even more flexible - just find any product description before ASIN with prices
          if (!germanMatchAlt) {
            germanMatchAlt = textBefore.match(
              /([^\n\r]{15,300}?)\s*\n\s*ASIN:\s*[A-Z0-9]{10}\s*\n\s*(\d+,\d{2})\s*€[\s\S]*?\((\d+)\)[\s\S]*?(\d+,\d{2})\s*€(\d+,\d{2})\s*€/s
            );
          }

          // Ultra flexible - look for any pattern with description, ASIN, quantity in parens, and prices
          if (!germanMatchAlt) {
            germanMatchAlt = textBefore.match(
              /([^\n\r]{10,400}?)\s*\n\s*ASIN:\s*[A-Z0-9]{10}[\s\S]*?\((\d+)\)[\s\S]*?(\d+,\d{2})\s*€(\d+,\d{2})\s*€/s
            );
          }

          // German-specific pattern: Look for the exact format we observed in diagnostic
          // Description -> ASIN -> Price € -> 0% -> (Quantity) -> UnitPrice € TotalPrice €
          if (!germanMatchAlt) {
            const germanDirectPattern = /([^\n\r]{50,500}?)\s*\n\s*ASIN:\s*([A-Z0-9]{10})\s*\n\s*(\d+,\d{2})\s*€\s*\n\s*0%\s*\n\s*\((\d+)\)\s*\n\s*(\d+,\d{2})\s*€\s*(\d+,\d{2})\s*€/s;
            const directMatch = textBefore.match(germanDirectPattern);
            if (directMatch) {
              console.log('   ✅ Matched direct German pattern for ASIN ' + directMatch[2]);
              germanMatchAlt = [null, directMatch[1], directMatch[4], directMatch[5], directMatch[6]];
            }
          }

          // Specific German pattern: Description → ASIN → Price → Tax% → (Quantity) → UnitPrice TotalPrice
          if (!germanMatchAlt) {
            // Look for the exact German format: ASIN line, then price line, tax line, (qty) line, prices line
            const lines = textBefore.split('\n').reverse(); // Start from the end (closest to ASIN)
            let description = '';
            let price = '';
            let tax = '';
            let quantity = '';
            let unitPrice = '';
            let totalPrice = '';

            // Find the ASIN line
            const asinIndex = lines.findIndex(line => line.includes('ASIN:'));
            if (asinIndex !== -1) {
              // Look backwards from ASIN for the pattern
              for (let i = asinIndex + 1; i < lines.length && i < asinIndex + 8; i++) {
                const line = lines[i].trim();
                if (!price && /^\d+,\d{2}\s*€$/.test(line)) {
                  price = line;
                } else if (!tax && /^\d+%?$/.test(line)) {
                  tax = line;
                } else if (!quantity && /^\((\d+)\)$/.test(line)) {
                  const qtyMatch = line.match(/\((\d+)\)/);
                  quantity = qtyMatch[1];
                } else if (!unitPrice && /^(\d+,\d{2})\s*€(\d+,\d{2})\s*€$/.test(line)) {
                  const priceMatch = line.match(/(\d+,\d{2})\s*€(\d+,\d{2})\s*€/);
                  unitPrice = priceMatch[1];
                  totalPrice = priceMatch[2];
                } else if (line && !line.includes('ASIN:') && !line.includes('€') && line.length > 10) {
                  // This might be description
                  if (!description) description = line;
                }
              }

              if (quantity && unitPrice && totalPrice) {
                // Create a synthetic match array
                germanMatchAlt = [null, description, quantity, unitPrice, totalPrice];
              }
            }
          }

          if (germanMatchAlt) {
            // Handle different regex patterns
            let description, unitPriceStr, totalStr, quantity;
            if (germanMatchAlt.length === 6) {
              // Even more flexible pattern: [full, description, firstPrice, qty, unitPrice, total]
              [, description, , quantity, unitPriceStr, totalStr] = germanMatchAlt;
              quantity = parseInt(quantity);
            } else if (germanMatchAlt.length === 5) {
              // Ultra flexible pattern: [full, description, quantity, unitPrice, total]
              [, description, quantity, unitPriceStr, totalStr] = germanMatchAlt;
              quantity = parseInt(quantity);
            } else if (germanMatchAlt.length === 4) {
              // Specific German pattern: [full, description, quantity, unitPrice, total]
              [, description, quantity, unitPriceStr, totalStr] = germanMatchAlt;
              quantity = parseInt(quantity);
            } else {
              // Other patterns: [full, description, unitPrice, taxInclPrice, total]
              [, description, unitPriceStr, , totalStr] = germanMatchAlt;
              quantity = 1; // German format seems to have individual entries
            }

            const unitPrice = parseFloat(unitPriceStr?.replace(',', '.') || '0');
            const totalPrice = parseFloat(totalStr?.replace(',', '.') || '0');

            // Calculate quantity from total ÷ unitPrice as validation/fallback
            if (unitPrice && totalPrice && quantity) {
              const calculatedQty = Math.round(totalPrice / unitPrice);
              if (calculatedQty >= 1 && calculatedQty <= 100 && Math.abs(calculatedQty * unitPrice - totalPrice) < 0.10) {
                quantity = calculatedQty;
                console.log(`   📊 Corrected quantity using total÷price: ${calculatedQty} (${totalPrice}€ ÷ ${unitPrice}€)`);
              }
            }

            // Validate that description looks like a product name (not header text)
            const cleanDescription = description.trim();
            // For German invoices, be more lenient with description validation
            // Skip if description looks like header text (contains only numbers/symbols, or header keywords)
            if (/^\d+\s*[:.]?\s*$/.test(cleanDescription) ||
                /\b(Bestellung|Artikel|Produkt|Summe|Total|Gesamt)\b/i.test(cleanDescription)) {
              console.log('   ⚠️  Skipping likely header text: "' + cleanDescription + '"');
            } else {
              console.log(
                '   ✅ Extracted German item (alt): ' + cleanDescription + ' (' + quantity + 'x ' + unitPrice + '€ = ' + totalPrice + '€)',
              );

              items.push({
                asin,
                description: cleanDescription,
                quantity,
                unitPrice,
                totalPrice,
                currency: 'EUR',
              });

              // Mark this position as processed to prevent overlapping extractions
              for (let i = Math.max(0, asinIndex - 1000); i < asinIndex + 1000; i++) {
                processedPositions.add(i);
              }
            }
          } else {
            // ========== TRY FORWARD SEARCH: Data comes AFTER ASIN ==========
            // Some PDF layouts have: ASIN first, then description and prices
            const textAfter = text.substring(asinIndex + match[0].length);

            // Look for German pattern AFTER the ASIN: BasePrice -> Tax -> (Qty) -> UnitPrice TotalPrice -> Description
            // This is the exact German format: base_price €\n0%\n(qty)\nunit_price €total_price €
            const germanForwardMatch = textAfter.match(
              /^(\d+,\d{2})\s*€\s*\n\s*0%\s*\n\s*\((\d+)\)\s*\n\s*(\d+,\d{2})\s*€(\d+,\d{2})\s*€\s*\n/s
            );

            if (germanForwardMatch) {
              const [, price1, quantity, unitPriceStr, totalStr, description] = germanForwardMatch;
              let quantityNum = parseInt(quantity);
              const unitPrice = parseFloat(unitPriceStr?.replace(',', '.') || '0');
              const totalPrice = parseFloat(totalStr?.replace(',', '.') || '0');

              // Calculate quantity from total ÷ unitPrice as validation/fallback
              if (unitPrice && totalPrice) {
                const calculatedQty = Math.round(totalPrice / unitPrice);
                if (calculatedQty >= 1 && calculatedQty <= 100 && Math.abs(calculatedQty * unitPrice - totalPrice) < 0.10) {
                  quantityNum = calculatedQty;
                  console.log(`   📊 Corrected quantity using total÷price: ${calculatedQty} (${totalPrice}€ ÷ ${unitPrice}€)`);
                }
              }

              // Validate description
              const cleanDescription = description.trim();
              if (cleanDescription.length < 10 ||
                  /^\d+\s*[:.]?\s*$/.test(cleanDescription) ||
                  /\b(Bestellung|Artikel|Produkt|Summe|Total|Gesamt)\b/i.test(cleanDescription)) {
                console.log('   ⚠️  Skipping likely header text (forward): "' + cleanDescription + '"');
              } else {
                console.log(
                  '   ✅ Extracted German item (forward): ' + cleanDescription + ' (' + quantityNum + 'x ' + unitPrice + '€ = ' + totalPrice + '€)',
                );

                items.push({
                  asin,
                  description: cleanDescription,
                  quantity: quantityNum,
                  unitPrice,
                  totalPrice,
                  currency: 'EUR',
                });

                // Mark this position as processed to prevent overlapping extractions
                for (let i = Math.max(0, asinIndex - 1000); i < asinIndex + 1000; i++) {
                  processedPositions.add(i);
                }
              }
            } else {
              console.log('   ⚠️  No data match for ASIN ' + asin + ' (checked both backward and forward)');
            }
          }
        }
      }

      // If no universal or German pattern matched, try French-specific patterns
      if (items.length === 0 || !items.find(item => item.asin === asin)) {
        // Try French-specific pattern (no pipes) - look for product description immediately before ASIN
        // French format might use different structure or keywords
        const frenchMatch = textBefore.match(
          /([^\n\r]{10,200}?)\s*\n\s*ASIN:\s*[A-Z0-9]{10}\s*\n\s*(\d+,\d{2})\s*€\s*\n\s*(\d+,\d{2})\s*€(\d+,\d{2})\s*€/s
        );

        if (frenchMatch) {
          const [, description, unitPriceStr, taxInclPriceStr, totalStr] = frenchMatch;
          let quantity = 1; // French format seems to have individual entries
          const unitPrice = parseFloat(unitPriceStr.replace(',', '.'));
          const totalPrice = parseFloat(totalStr.replace(',', '.'));

          // Calculate quantity from total ÷ unitPrice as validation/fallback
          if (unitPrice && totalPrice) {
            const calculatedQty = Math.round(totalPrice / unitPrice);
            if (calculatedQty >= 1 && calculatedQty <= 100 && Math.abs(calculatedQty * unitPrice - totalPrice) < 0.10) {
              quantity = calculatedQty;
              console.log(`   📊 Corrected quantity using total÷price: ${calculatedQty} (${totalPrice}€ ÷ ${unitPrice}€)`);
            }
          }

          // Validate that description looks like a product name (not header text)
          const cleanDescription = description.trim();
          // Skip if description looks like header text (too short, contains only numbers/symbols, or French header keywords)
          if (cleanDescription.length < 10 ||
              /^\d+\s*[:.]?\s*$/.test(cleanDescription) ||
              /\b(Commande|Article|Produit|Somme|Total|Total\s*TTC|Facture)\b/i.test(cleanDescription)) {
            console.log('   ⚠️  Skipping likely header text: "' + cleanDescription + '"');
          } else {
            console.log(
              '   ✅ Extracted French item: ' + cleanDescription + ' (' + quantity + 'x ' + unitPrice + '€ = ' + totalPrice + '€)',
            );

            items.push({
              asin,
              description: cleanDescription,
              quantity,
              unitPrice,
              totalPrice,
              currency: 'EUR',
            });

            // Mark this position as processed to prevent overlapping extractions
            for (let i = Math.max(0, asinIndex - 1000); i < asinIndex + 1000; i++) {
              processedPositions.add(i);
            }
          }
        } else {
          // Try alternative French-specific pattern with tax and quantity variations
          const frenchMatchAlt = textBefore.match(
            /([^\n\r]{10,200}?)\s*\n\s*ASIN:\s*[A-Z0-9]{10}\s*\n\s*(\d+,\d{2})\s*€\s*\n\s*\d+%?\s*\n\s*\(\d+\)\s*\n\s*(\d+,\d{2})\s*€(\d+,\d{2})\s*€/s
          );

          if (frenchMatchAlt) {
            const [, description, unitPriceStr, taxInclPriceStr, totalStr] = frenchMatchAlt;
            let quantity = 1; // French format seems to have individual entries
            const unitPrice = parseFloat(unitPriceStr.replace(',', '.'));
            const totalPrice = parseFloat(totalStr.replace(',', '.'));

            // Calculate quantity from total ÷ unitPrice as validation/fallback
            if (unitPrice && totalPrice) {
              const calculatedQty = Math.round(totalPrice / unitPrice);
              if (calculatedQty >= 1 && calculatedQty <= 100 && Math.abs(calculatedQty * unitPrice - totalPrice) < 0.10) {
                quantity = calculatedQty;
                console.log(`   📊 Corrected quantity using total÷price: ${calculatedQty} (${totalPrice}€ ÷ ${unitPrice}€)`);
              }
            }

            // Validate that description looks like a product name (not header text)
            const cleanDescription = description.trim();
            // Skip if description looks like header text (too short, contains only numbers/symbols, or French header keywords)
            if (cleanDescription.length < 10 ||
                /^\d+\s*[:.]?\s*$/.test(cleanDescription) ||
                /\b(Commande|Article|Produit|Somme|Total|Total\s*TTC|Facture)\b/i.test(cleanDescription)) {
              console.log('   ⚠️  Skipping likely header text: "' + cleanDescription + '"');
            } else {
              console.log(
                '   ✅ Extracted French item (alt): ' + cleanDescription + ' (' + quantity + 'x ' + unitPrice + '€ = ' + totalPrice + '€)',
              );

              items.push({
                asin,
                description: cleanDescription,
                quantity,
                unitPrice,
                totalPrice,
                currency: 'EUR',
              });

              // Mark this position as processed to prevent overlapping extractions
              for (let i = Math.max(0, asinIndex - 1000); i < asinIndex + 1000; i++) {
                processedPositions.add(i);
              }
            }
          } else {
            // ========== PATTERN: French Business Format (Prices AFTER ASIN) ==========
            // French format: Description → ASIN → Prices on separate lines after
            // Line 1: HT price (195,82 €)
            // Line 2: Tax rate (0 %)
            // Line 3: Quantity ((1))
            // Line 4: Unit TTC + Total TTC (95,82 €95,82 €)

            // Look for French business format AFTER the ASIN
            const textAfter = text.substring(asinIndex + match[0].length);

            // More flexible French pattern - try multiple variations
            let frenchMatch = textAfter.match(
              /(\d+,\d{2})\s*€[\s\S]*?0\s*%[\s\S]*?\((\d+)\)[\s\S]*?(\d+,\d{2})\s*€(\d+,\d{2})\s*€/
            );

            // Alternative French pattern: Different tax rate or simpler format
            if (!frenchMatch) {
              frenchMatch = textAfter.match(
                /(\d+,\d{2})\s*€[\s\S]*?\d+\s*%[\s\S]*?\((\d+)\)[\s\S]*?(\d+,\d{2})\s*€(\d+,\d{2})\s*€/
              );
            }

            // Simpler French pattern: Just quantity and prices (create proper group structure)
            if (!frenchMatch) {
              const simpleMatch = textAfter.match(
                /\((\d+)\)[\s\S]*?(\d+,\d{2})\s*€(\d+,\d{2})\s*€/
              );
              if (simpleMatch) {
                // Create the expected group structure: [full, htPrice, qty, unitPrice, total]
                frenchMatch = [simpleMatch[0], '0,00', simpleMatch[1], simpleMatch[2], simpleMatch[3]];
              }
            }


            if (frenchMatch) {
              try {
                const [, htPrice, qtyStr, unitPriceTTCStr, totalStr] = frenchMatch;
                let quantity = parseInt(qtyStr);
                const unitPrice = parseFloat(unitPriceTTCStr?.replace(',', '.') || '0');
                const totalPrice = parseFloat(totalStr?.replace(',', '.') || '0');

                // Calculate quantity from total ÷ unitPrice as validation/correction
                if (unitPrice && totalPrice) {
                  const calculatedQty = Math.round(totalPrice / unitPrice);
                  if (calculatedQty >= 1 && calculatedQty <= 100 && Math.abs(calculatedQty * unitPrice - totalPrice) < 0.10) {
                    quantity = calculatedQty;
                    console.log(`   📊 Corrected quantity using total÷price: ${calculatedQty} (${totalPrice}€ ÷ ${unitPrice}€)`);
                  }
                }

                // Verify math
                const calculated = quantity * unitPrice;
                if (Math.abs(calculated - totalPrice) < 0.10) {
                  // Get description from BEFORE ASIN
                  let description = 'Product';
                  const lines = textBefore.split('\n').filter(l => l.trim());

                  // French headers to exclude
                  const excludePatterns = [
                    /^(Description|Qté|Prix|Unitaire|Taux|TVA|Total|TTC|HT)/i,
                    /^\s*$/,
                    /^[\d\s€%,()]+$/,
                  ];

                  // Look backwards for product description
                  const descLines = [];
                  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 8); i--) {
                    const line = lines[i]?.trim();
                    if (!line) continue;

                    const shouldExclude = excludePatterns.some(p => p.test(line));

                    if (!shouldExclude &&
                        line.length > 20 &&
                        !line.includes('ASIN:') &&
                        !line.includes('€')) {
                      descLines.unshift(line); // Add to beginning

                      // Collect up to 3 lines for full description
                      if (descLines.length >= 3) break;
                    }
                  }

                  if (descLines.length > 0) {
                    description = descLines.join(' ').trim();
                    // Limit length
                    if (description.length > 200) {
                      description = description.substring(0, 200);
                    }
                  }

                  console.log(
                    '   ✅ Pattern FR (French business): ' + description.substring(0, 45) +
                    '... (' + quantity + 'x ' + unitPrice + '€ = ' + totalPrice + '€)',
                  );

                  items.push({
                    asin,
                    description,
                    quantity,
                    unitPrice,
                    totalPrice,
                    currency: 'EUR',
                  });

                  // Mark this position as processed to prevent overlapping extractions
                  for (let i = Math.max(0, asinIndex - 1000); i < asinIndex + 1000; i++) {
                    processedPositions.add(i);
                  }
                }
              } catch (error) {
                console.log('   ⚠️  French pattern error for ASIN ' + asin + ': ' + error.message);
              }
            } else {
              console.log('   ⚠️  No data match for ASIN ' + asin);
            }
          }
        }
      }
    }

    console.log('   Total items extracted: ' + items.length);

    // ========== CONSERVATIVE DEDUPLICATION ==========
    // Only remove items that are EXACTLY identical AND likely parsing errors
    // Preserve legitimate multiple purchases of the same product (common in bulk orders)
    const uniqueItems = [];
    const seen = new Set();

    for (const item of items) {
      // Create key from all fields - identical items might be legitimate duplicates in invoices
      const key = `${item.asin || 'NO-ASIN'}-${item.description || 'NO-DESC'}-${item.unitPrice}-${item.quantity}-${item.totalPrice}`;

      // For EU business invoices, assume multiple identical items are legitimate unless they're truly suspicious
      // Only deduplicate if we have strong evidence it's a parsing error (same position, etc.)
      // For now, don't deduplicate at all - let the business logic handle it
      uniqueItems.push(item);
    }

    console.log(`   📊 Deduplication: ${items.length} → ${uniqueItems.length} items (conservative - preserves legitimate duplicates)`);
    return uniqueItems;
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
