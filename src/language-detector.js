/**
 * Language Detector
 *
 * Second stage in the three-stage pipeline:
 * PDF Text → [1] Preprocessor → [2] Language Detector → [3] Language-Specific Parser → Invoice Data
 *
 * Responsibilities:
 * - Analyze preprocessed text to identify invoice language/country
 * - Use language-specific patterns and keywords to determine origin
 * - Return language code and confidence score
 */

class LanguageDetector {
  /**
   * Supported languages/country codes
   */
  static get SUPPORTED_LANGUAGES() {
    return {
      'ES': 'Spanish',
      'DE': 'German',
      'EN': 'English',
      'FR': 'French',
      'IT': 'Italian',
      'JP': 'Japanese',
      'CA': 'Canadian French',
      'AU': 'Australian English',
      'CH': 'Swiss German',
      'GB': 'British English'
    };
  }

  /**
   * Detect the language/country of an invoice from preprocessed text
   * @param {string} text - Preprocessed invoice text
   * @returns {Object} - Detection result with language code, confidence, and evidence
   */
  static detect(text) {
    if (!text || typeof text !== 'string') {
      return this.createResult('UNKNOWN', 0, 'No text provided');
    }

    const detections = [];

    // Test each language detector
    for (const [code, name] of Object.entries(this.SUPPORTED_LANGUAGES)) {
      const confidence = this[`detect${code}`](text);
      if (confidence > 0) {
        detections.push({ code, name, confidence });
      }
    }

    // Sort by confidence (highest first)
    detections.sort((a, b) => b.confidence - a.confidence);

    if (detections.length === 0) {
      return this.createResult('UNKNOWN', 0, 'No language patterns detected');
    }

    const bestMatch = detections[0];

    // If confidence is very low, consider it unknown
    if (bestMatch.confidence < 0.3) {
      return this.createResult('UNKNOWN', bestMatch.confidence, 'Low confidence detection');
    }

    return this.createResult(bestMatch.code, bestMatch.confidence, `Detected ${bestMatch.name} patterns`);
  }

  /**
   * Create a standardized detection result
   * @param {string} language - Language code
   * @param {number} confidence - Confidence score (0-1)
   * @param {string} evidence - Explanation of detection
   * @returns {Object} - Detection result object
   */
  static createResult(language, confidence, evidence) {
    return {
      language,
      confidence: Math.round(confidence * 100) / 100, // Round to 2 decimal places
      evidence,
      supported: Object.keys(this.SUPPORTED_LANGUAGES).includes(language)
    };
  }

  /**
   * Detect Spanish invoices (ES)
   * @param {string} text - Preprocessed text
   * @returns {number} - Confidence score (0-1)
   */
  static detectES(text) {
    let score = 0;
    const upperText = text.toUpperCase();

    // High confidence indicators (Spanish-specific terms)
    const highConfidencePatterns = [
      /\bASIN:/i,                    // Amazon Standard Identification Number (common in Spanish invoices)
      /\bIVA\s+\d/i,                 // IVA (Value Added Tax in Spain)
      /\bESPAÑA\b/i,                 // España
      /\bIMPORTE\s+TOTAL\b/i,        // Importe Total
      /\bPEDIDO\s+REALIZADO\b/i,     // Pedido Realizado
      /\bFECHA\s+DEL\s+PEDIDO\b/i,   // Fecha del pedido
      /\bNÚMERO\s+DE\s+PEDIDO\b/i,   // Número de pedido
      /\bSUBTOTAL\b/i,               // Subtotal (Spanish)
      /\bTOTAL\b/i,                  // Total
      /\bENVÍO\b/i,                  // Envío (shipping)
      /\bPRODUCTOS\b/i,              // Productos
      /\bDESCRIPCIÓN\b/i             // Descripción
    ];

    // Medium confidence indicators
    const mediumConfidencePatterns = [
      /\bEL\s+PEDIDO\b/i,            // El pedido
      /\bSU\s+PEDIDO\b/i,            // Su pedido
      /\bHA\s+SIDO\b/i,              // Ha sido
      /\bGRACIAS\s+POR\b/i,          // Gracias por
      /\bSU\s+COMPRA\b/i             // Su compra
    ];

    // Currency patterns (€ is used in Spain)
    const currencyPatterns = [
      /\d+[,.]\d{2}\s*€/g,          // European decimal format with €
      /\d{1,3}(?:\.\d{3})*,\d{2}\s*€/g  // Spanish number format with €
    ];

    // Count high confidence matches
    for (const pattern of highConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.15; // Each high confidence pattern adds 15%
      }
    }

    // Count medium confidence matches
    for (const pattern of mediumConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.08; // Each medium confidence pattern adds 8%
      }
    }

    // Count currency patterns (adds up to 20% total)
    let currencyMatches = 0;
    for (const pattern of currencyPatterns) {
      const matches = upperText.match(pattern);
      if (matches) {
        currencyMatches += matches.length;
      }
    }
    if (currencyMatches > 0) {
      score += Math.min(currencyMatches * 0.05, 0.20); // Up to 20% for currency patterns
    }

    // Spanish date patterns (DD/MM/YYYY or DD.MM.YYYY)
    if (/\b\d{1,2}[./]\d{1,2}[./]\d{4}\b/.test(upperText)) {
      score += 0.10;
    }

    return Math.min(score, 1.0); // Cap at 100%
  }

  /**
   * Detect German invoices (DE)
   * @param {string} text - Preprocessed text
   * @returns {number} - Confidence score (0-1)
   */
  static detectDE(text) {
    let score = 0;
    const upperText = text.toUpperCase();

    // High confidence indicators (German-specific terms)
    const highConfidencePatterns = [
      /\bBESTELLNUMMER\b/i,          // Bestellnummer (Order number)
      /\bBESTELLDATUM\b/i,           // Bestelldatum (Order date)
      /\bARTIKEL\b/i,                // Artikel (Items)
      /\bZWISCHENSUMME\b/i,          // Zwischensumme (Subtotal)
      /\bVERSAND\b/i,                // Versand (Shipping)
      /\bMWST\b/i,                   // MwSt (VAT)
      /\bGESAMTBETRAG\b/i,           // Gesamtbetrag (Total amount)
      /\bRECHNUNGSADRESSE\b/i,       // Rechnungsadresse (Billing address)
      /\bLIEFERADRESSE\b/i,          // Lieferadresse (Delivery address)
      /\bZAHLUNGSART\b/i,            // Zahlungsart (Payment method)
      /\bAMAZON\.DE\b/i              // Amazon.de domain
    ];

    // Medium confidence indicators
    const mediumConfidencePatterns = [
      /\bIHR\s+AUFTRAG\b/i,          // Ihr Auftrag (Your order)
      /\bVIELE\s+GRÜSSE\b/i,         // Viele Grüße (Best regards)
      /\bAMAZON\s+EU\s+S\.À\s+R\.L\b/i, // Amazon EU company name
      /\bSTEUERNR\b/i,               // SteuerNr (Tax number)
      /\bUST-IDNR\b/i                // USt-IDNr (VAT ID)
    ];

    // Count high confidence matches
    for (const pattern of highConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.15;
      }
    }

    // Count medium confidence matches
    for (const pattern of mediumConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.08;
      }
    }

    // German currency patterns (€)
    if (/\d+[,.]\d{2}\s*€/g.test(upperText)) {
      score += 0.15;
    }

    // German date patterns (DD.MM.YYYY)
    if (/\b\d{1,2}\.\d{1,2}\.\d{4}\b/.test(upperText)) {
      score += 0.10;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Detect English invoices (EN)
   * @param {string} text - Preprocessed text
   * @returns {number} - Confidence score (0-1)
   */
  static detectEN(text) {
    let score = 0;
    const upperText = text.toUpperCase();

    // High confidence indicators (English-specific terms)
    const highConfidencePatterns = [
      /\bORDER\s+PLACED\b/i,          // Order Placed
      /\bORDER\s+NUMBER\b/i,          // Order Number
      /\bORDER\s+CONFIRMATION\b/i,    // Order Confirmation
      /\bITEMS\s+ORDERED\b/i,         // Items Ordered
      /\bSHIPPING\b/i,                // Shipping
      /\bSUBTOTAL\b/i,                // Subtotal
      /\bTAX\b/i,                     // Tax
      /\bGRAND\s+TOTAL\b/i,           // Grand Total
      /\bPAYMENT\s+METHOD\b/i,        // Payment Method
      /\bBILLING\s+ADDRESS\b/i,       // Billing Address
      /\bSHIPPING\s+ADDRESS\b/i       // Shipping Address
    ];

    // Medium confidence indicators
    const mediumConfidencePatterns = [
      /\bTHANK\s+YOU\b/i,             // Thank You
      /\bFOR\s+YOUR\s+ORDER\b/i,      // For your order
      /\bAMAZON\.COM\b/i,             // Amazon.com domain
      /\bAMAZON\.CA\b/i,              // Amazon.ca domain
      /\bAMAZON\.CO\.UK\b/i           // Amazon.co.uk domain
    ];

    // Count high confidence matches
    for (const pattern of highConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.15;
      }
    }

    // Count medium confidence matches
    for (const pattern of mediumConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.08;
      }
    }

    // English currency patterns ($ for US/CA, £ for UK)
    const currencyMatches = upperText.match(/[$£]\s*\d{1,3}(?:[,.]\d{3})*[,.]?\d*/g);
    if (currencyMatches && currencyMatches.length > 0) {
      score += Math.min(currencyMatches.length * 0.05, 0.15);
    }

    // English date patterns (Month DD, YYYY)
    if (/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i.test(upperText)) {
      score += 0.10;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Detect French invoices (FR)
   * @param {string} text - Preprocessed text
   * @returns {number} - Confidence score (0-1)
   */
  static detectFR(text) {
    let score = 0;
    const upperText = text.toUpperCase();

    // High confidence indicators (French-specific terms)
    const highConfidencePatterns = [
      /\bNUMÉRO\s+DE\s+COMMANDE\b/i,   // Numéro de commande
      /\bDATE\s+DE\s+COMMANDE\b/i,     // Date de commande
      /\bARTICLES\b/i,                 // Articles
      /\bSOUS-TOTAL\b/i,               // Sous-total
      /\bLIVRAISON\b/i,                // Livraison
      /\bTVA\b/i,                      // TVA (VAT)
      /\bTOTAL\s+TTC\b/i,              // Total TTC
      /\bMODE\s+DE\s+PAIEMENT\b/i,     // Mode de paiement
      /\bADRESSE\s+DE\s+FACTURATION\b/i, // Adresse de facturation
      /\bADRESSE\s+DE\s+LIVRAISON\b/i,   // Adresse de livraison
      /\bAMAZON\.FR\b/i                // Amazon.fr domain
    ];

    // Medium confidence indicators
    const mediumConfidencePatterns = [
      /\bVOTRE\s+COMMANDE\b/i,         // Votre commande
      /\bMERCI\s+POUR\b/i,             // Merci pour
      /\bVOTRE\s+ACHAT\b/i,            // Votre achat
      /\bNOUS\s+VOUS\b/i,              // Nous vous
      /\bTÉLÉPHONE\b/i                 // Téléphone
    ];

    // Count high confidence matches
    for (const pattern of highConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.15;
      }
    }

    // Count medium confidence matches
    for (const pattern of mediumConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.08;
      }
    }

    // French currency patterns (€)
    if (/\d+[,.]\d{2}\s*€/g.test(upperText)) {
      score += 0.15;
    }

    // French date patterns (DD/MM/YYYY or DD.MM.YYYY)
    if (/\b\d{1,2}[./]\d{1,2}[./]\d{4}\b/.test(upperText)) {
      score += 0.10;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Detect Italian invoices (IT)
   * @param {string} text - Preprocessed text
   * @returns {number} - Confidence score (0-1)
   */
  static detectIT(text) {
    let score = 0;
    const upperText = text.toUpperCase();

    // High confidence indicators (Italian-specific terms)
    const highConfidencePatterns = [
      /\bNUMERO\s+D'ORDINE\b/i,        // Numero d'ordine
      /\bDATA\s+DELL'ORDINE\b/i,       // Data dell'ordine
      /\bARTICOLI\b/i,                 // Articoli
      /\bSUBTOTALE\b/i,                // Subtotale
      /\bSPEDIZIONE\b/i,               // Spedizione
      /\bIVA\b/i,                      // IVA (VAT)
      /\bTOTALE\b/i,                   // Totale
      /\bAMAZON\.IT\b/i                // Amazon.it domain
    ];

    // Medium confidence indicators
    const mediumConfidencePatterns = [
      /\bIL\s+TUO\s+ORDINE\b/i,        // Il tuo ordine
      /\bGRAZIE\s+PER\b/i,             // Grazie per
      /\bIL\s+TUO\s+ACQUISTO\b/i,      // Il tuo acquisto
      /\bTELEFONO\b/i                  // Telefono
    ];

    // Count high confidence matches
    for (const pattern of highConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.15;
      }
    }

    // Count medium confidence matches
    for (const pattern of mediumConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.08;
      }
    }

    // Italian currency patterns (€)
    if (/\d+[,.]\d{2}\s*€/g.test(upperText)) {
      score += 0.15;
    }

    // Italian date patterns (DD/MM/YYYY or DD.MM.YYYY)
    if (/\b\d{1,2}[./]\d{1,2}[./]\d{4}\b/.test(upperText)) {
      score += 0.10;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Detect Japanese invoices (JP)
   * @param {string} text - Preprocessed text
   * @returns {number} - Confidence score (0-1)
   */
  static detectJP(text) {
    let score = 0;
    const upperText = text.toUpperCase();

    // High confidence indicators (Japanese-specific terms)
    const highConfidencePatterns = [
      /\b注文番号\b/i,                    // Chūmon bangō (Order number)
      /\b注文日\b/i,                      // Chūmon bi (Order date)
      /\b商品\b/i,                        // Shōhin (Items)
      /\b小計\b/i,                        // Shōkei (Subtotal)
      /\b配送料\b/i,                      // Haisō ryō (Shipping)
      /\b消費税\b/i,                      // Shōhi zei (Tax)
      /\b合計\b/i,                        // Gōkei (Total)
      /\bAMAZON\.CO\.JP\b/i              // Amazon.co.jp domain
    ];

    // Medium confidence indicators
    const mediumConfidencePatterns = [
      /\bお届け先\b/i,                    // Otodoke saki (Delivery address)
      /\bお支払い方法\b/i,                // Oshi harai hōhō (Payment method)
      /\b円\b/i,                         // Yen symbol
      /\b年\d{1,2}月\d{1,2}日\b/i        // Japanese date format
    ];

    // Count high confidence matches
    for (const pattern of highConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.15;
      }
    }

    // Count medium confidence matches
    for (const pattern of mediumConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.08;
      }
    }

    // Japanese currency patterns (¥)
    if (/\d+[,.]\d{2}\s*¥/g.test(upperText) || /¥\s*\d+[,.]\d{2}/g.test(upperText)) {
      score += 0.15;
    }

    // Japanese date patterns (YYYY年MM月DD日)
    if (/\d{4}年\d{1,2}月\d{1,2}日/.test(upperText)) {
      score += 0.10;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Detect Canadian French invoices (CA)
   * @param {string} text - Preprocessed text
   * @returns {number} - Confidence score (0-1)
   */
  static detectCA(text) {
    let score = 0;
    const upperText = text.toUpperCase();

    // High confidence indicators (Canadian French-specific terms)
    const highConfidencePatterns = [
      /\bNUMÉRO\s+DE\s+COMMANDE\b/i,   // Numéro de commande
      /\bCOMMANDE\s+PASSÉE\b/i,        // Commande passée
      /\bARTICLES\b/i,                 // Articles
      /\bSOUS-TOTAL\b/i,               // Sous-total
      /\bLIVRAISON\b/i,                // Livraison
      /\bTPS\b/i,                      // TPS (GST)
      /\bTVH\b/i,                      // TVH (HST)
      /\bÀ\s+PAYER\b/i,                // À payer
      /\bAMAZON\.CA\b/i                // Amazon.ca domain
    ];

    // Medium confidence indicators
    const mediumConfidencePatterns = [
      /\bVOTRE\s+COMMANDE\b/i,         // Votre commande
      /\bADRESSE\s+DE\s+LIVRAISON\b/i, // Adresse de livraison
      /\bMODE\s+DE\s+PAIEMENT\b/i,     // Mode de paiement
      /\bCANADA\b/i,                   // Canada
      /\bQUÉBEC\b/i                    // Québec
    ];

    // Count high confidence matches
    for (const pattern of highConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.15;
      }
    }

    // Count medium confidence matches
    for (const pattern of mediumConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.08;
      }
    }

    // Canadian currency patterns ($)
    if (/\$\s*\d{1,3}(?:[,.]\d{3})*[,.]\d{2}/g.test(upperText)) {
      score += 0.15;
    }

    // Canadian date patterns (DD/MM/YYYY common)
    if (/\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(upperText)) {
      score += 0.10;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Detect Australian invoices (AU)
   * @param {string} text - Preprocessed text
   * @returns {number} - Confidence score (0-1)
   */
  static detectAU(text) {
    let score = 0;
    const upperText = text.toUpperCase();

    // High confidence indicators (Australian-specific terms)
    const highConfidencePatterns = [
      /\bORDER\s+PLACED\b/i,          // Order Placed
      /\bORDER\s+NUMBER\b/i,          // Order Number
      /\bITEMS\s+ORDERED\b/i,         // Items Ordered
      /\bSHIPPING\b/i,                // Shipping
      /\bSUBTOTAL\b/i,                // Subtotal
      /\bGST\b/i,                     // GST (Australian tax)
      /\bGRAND\s+TOTAL\b/i,           // Grand Total
      /\bPAYMENT\s+METHOD\b/i,        // Payment Method
      /\bAMAZON\.COM\.AU\b/i          // Amazon.com.au domain
    ];

    // Medium confidence indicators
    const mediumConfidencePatterns = [
      /\bDELIVERY\b/i,                // Delivery
      /\bAUSTRALIA\b/i,               // Australia
      /\bTHANK\s+YOU\b/i,             // Thank You
      /\bFOR\s+YOUR\s+ORDER\b/i       // For your order
    ];

    // Count high confidence matches
    for (const pattern of highConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.15;
      }
    }

    // Count medium confidence matches
    for (const pattern of mediumConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.08;
      }
    }

    // Australian currency patterns ($)
    if (/\$\s*\d{1,3}(?:[,.]\d{3})*[,.]\d{2}/g.test(upperText)) {
      score += 0.15;
    }

    // Australian date patterns (DD/MM/YYYY common)
    if (/\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(upperText)) {
      score += 0.10;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Detect Swiss invoices (CH)
   * @param {string} text - Preprocessed text
   * @returns {number} - Confidence score (0-1)
   */
  static detectCH(text) {
    let score = 0;
    const upperText = text.toUpperCase();

    // High confidence indicators (Swiss German-specific terms)
    const highConfidencePatterns = [
      /\bBESTELLNUMMER\b/i,          // Bestellnummer
      /\bBESTELLDATUM\b/i,           // Bestelldatum
      /\bARTIKEL\b/i,                // Artikel
      /\bZWISCHENSUMME\b/i,          // Zwischensumme
      /\bVERSAND\b/i,                // Versand
      /\bMWST\b/i,                   // MWST
      /\bGESAMTBETRAG\b/i,           // Gesamtbetrag
      /\bZAHLUNGSART\b/i,            // Zahlungsart
      /\bAMAZON\.DE\b/i,             // Amazon.de (used for Switzerland)
      /\bSCHWEIZ\b/i                 // Schweiz (Switzerland)
    ];

    // Medium confidence indicators
    const mediumConfidencePatterns = [
      /\bIHR\s+AUFTRAG\b/i,          // Ihr Auftrag
      /\bVIELE\s+GRÜSSE\b/i,         // Viele Grüße
      /\bCHF\b/i,                    // CHF currency
      /\bSTEUERNR\b/i                // SteuerNr
    ];

    // Count high confidence matches
    for (const pattern of highConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.15;
      }
    }

    // Count medium confidence matches
    for (const pattern of mediumConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.08;
      }
    }

    // Swiss currency patterns (CHF)
    if (/\bCHF\s*\d+[,.]\d{2}/g.test(upperText)) {
      score += 0.15;
    }

    // Swiss date patterns (DD.MM.YYYY common)
    if (/\b\d{1,2}\.\d{1,2}\.\d{4}\b/.test(upperText)) {
      score += 0.10;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Detect UK invoices (GB)
   * @param {string} text - Preprocessed text
   * @returns {number} - Confidence score (0-1)
   */
  static detectGB(text) {
    let score = 0;
    const upperText = text.toUpperCase();

    // High confidence indicators (UK-specific terms)
    const highConfidencePatterns = [
      /\bORDER\s+PLACED\b/i,          // Order Placed
      /\bORDER\s+NUMBER\b/i,          // Order Number
      /\bORDER\s+CONFIRMATION\b/i,    // Order Confirmation
      /\bITEMS\s+ORDERED\b/i,         // Items Ordered
      /\bSHIPPING\b/i,                // Shipping
      /\bSUBTOTAL\b/i,                // Subtotal
      /\bVAT\b/i,                     // VAT (UK tax)
      /\bGRAND\s+TOTAL\b/i,           // Grand Total
      /\bPAYMENT\s+METHOD\b/i,        // Payment Method
      /\bAMAZON\.CO\.UK\b/i           // Amazon.co.uk domain
    ];

    // Medium confidence indicators
    const mediumConfidencePatterns = [
      /\bDELIVERY\b/i,                // Delivery
      /\bPOSTAGE\b/i,                 // Postage
      /\bUNITED\s+KINGDOM\b/i,        // United Kingdom
      /\bTHANK\s+YOU\b/i,             // Thank You
      /\bFOR\s+YOUR\s+ORDER\b/i       // For your order
    ];

    // Count high confidence matches
    for (const pattern of highConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.15;
      }
    }

    // Count medium confidence matches
    for (const pattern of mediumConfidencePatterns) {
      if (pattern.test(upperText)) {
        score += 0.08;
      }
    }

    // UK currency patterns (£)
    if (/£\s*\d{1,3}(?:[,.]\d{3})*[,.]\d{2}/g.test(upperText)) {
      score += 0.15;
    }

    // UK date patterns (DD/MM/YYYY common)
    if (/\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(upperText)) {
      score += 0.10;
    }

    return Math.min(score, 1.0);
  }
}

module.exports = LanguageDetector;