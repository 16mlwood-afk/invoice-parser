/**
 * Format Classifier - Stage 2
 *
 * Analyzes preprocessed text to detect Amazon format (US vs EU).
 * Uses pattern-based scoring with weighted confidence levels.
 *
 * Pipeline: Light Preprocessor → [HERE] → Format-Specific Preprocessor
 */

const LightPreprocessor = require('./preprocessors/light-preprocessor');

class FormatClassifier {
  /**
   * Classify text format and confidence
   * @param {string} rawText - Raw PDF text content
   * @returns {Object} Classification result with format, confidence, quality, scores, subtype
   */
  static classify(rawText) {
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      throw new Error('Cannot classify empty text');
    }

    // Apply light preprocessing for reliable pattern matching
    const processedText = LightPreprocessor.preprocess(rawText);

    // Score each format
    const scores = this.calculateScores(processedText);

    // Determine winning format
    const format = this.determineFormat(scores);

    // NEW: Detect subtype for EU invoices
    let subtype = null;
    if (format === 'amazon.eu') {
      subtype = this.detectEUSubtype(processedText);
    }

    // Calculate overall confidence
    const confidence = this.calculateConfidence(scores, format);

    // Determine quality level and action
    const quality = this.determineQuality(confidence, scores);

    return {
      format,
      subtype,
      confidence,
      quality,
      scores
    };
  }

  /**
   * Calculate scores for each Amazon format
   * @param {string} text - Preprocessed text
   * @returns {Object} Scores for amazon.com and amazon.eu
   */
  static calculateScores(text) {
    const patterns = {
      'amazon.com': {
        // US-specific patterns (40pts each)
        'amazon.com': 40,
        'Order #': 40,
        'Order Placed:': 40,
        'Shipped to:': 40,
        'Sold by:': 40,
        'Shipped by:': 40,

        // US currency patterns (20pts each)
        '$': 20,
        'USD': 20,

        // US date patterns (15pts each)
        'January': 15, 'February': 15, 'March': 15, 'April': 15,
        'May': 15, 'June': 15, 'July': 15, 'August': 15,
        'September': 15, 'October': 15, 'November': 15, 'December': 15
      },

      'amazon.eu': {
        // EU-specific patterns (40pts each)
        'amazon.de': 40,
        'amazon.fr': 40,
        'amazon.it': 40,
        'amazon.es': 40,
        'amazon.co.uk': 40,
        'amazon.nl': 40,
        'amazon.se': 40,
        'amazon.pl': 40,

        // ASIN pattern (40pts - gold standard for EU)
        'ASIN:': 40,

        // EU currency patterns (20pts each)
        '€': 20,
        'EUR': 20,
        '£': 20,
        'GBP': 20,
        'CHF': 20,

        // EU date patterns (15pts each)
        'Januar': 15, 'Februar': 15, 'März': 15, 'April': 15,
        'Mai': 15, 'Juni': 15, 'Juli': 15, 'August': 15,
        'September': 15, 'Oktober': 15, 'November': 15, 'Dezember': 15,

        // French months
        'janvier': 15, 'février': 15, 'mars': 15, 'avril': 15,
        'mai': 15, 'juin': 15, 'juillet': 15, 'août': 15,
        'septembre': 15, 'octobre': 15, 'novembre': 15, 'décembre': 15,

        // Spanish months
        'enero': 15, 'febrero': 15, 'marzo': 15, 'abril': 15,
        'mayo': 15, 'junio': 15, 'julio': 15, 'agosto': 15,
        'septiembre': 15, 'octubre': 15, 'noviembre': 15, 'diciembre': 15,

        // Italian months
        'gennaio': 15, 'febbraio': 15, 'marzo': 15, 'aprile': 15,
        'maggio': 15, 'giugno': 15, 'luglio': 15, 'agosto': 15,
        'settembre': 15, 'ottobre': 15, 'novembre': 15, 'dicembre': 15,

        // EU keywords (25pts each)
        'Rechnung': 25,     // German invoice
        'Commande': 25,     // French order
        'Ordine': 25,       // Italian order
        'Pedido': 25,       // Spanish order
        'Bestellung': 25,   // German order
        'Facture': 25,      // French invoice
        'Fattura': 25,      // Italian invoice
        'Factura': 25       // Spanish invoice
      }
    };

    const scores = { 'amazon.com': 0, 'amazon.eu': 0 };

    // Score each format
    for (const [format, formatPatterns] of Object.entries(patterns)) {
      for (const [pattern, points] of Object.entries(formatPatterns)) {
        // Case-insensitive pattern matching
        if (text.toLowerCase().includes(pattern.toLowerCase())) {
          scores[format] += points;
        }
      }
    }

    return scores;
  }

  /**
   * Determine winning format based on scores
   * @param {Object} scores - Scores for each format
   * @returns {string|null} Winning format or null if no clear winner
   */
  static determineFormat(scores) {
    const comScore = scores['amazon.com'];
    const euScore = scores['amazon.eu'];

    // If both scores are very low, it's not an Amazon invoice
    if (comScore < 25 && euScore < 25) {
      return null;
    }

    // EU wins ties (ASIN is gold standard)
    if (euScore >= comScore) {
      return 'amazon.eu';
    } else {
      return 'amazon.com';
    }
  }

  /**
   * Calculate confidence percentage based on absolute score and competition
   * @param {Object} scores - Scores for each format
   * @param {string} format - Winning format
   * @returns {number} Confidence as percentage (0-100)
   */
  static calculateConfidence(scores, format) {
    if (!format) {
      return 0;
    }

    const winnerScore = scores[format];
    const loserScore = scores[format === 'amazon.com' ? 'amazon.eu' : 'amazon.com'];

    // If both formats have significant scores (>25), reduce confidence due to ambiguity
    const bothPresent = winnerScore >= 25 && loserScore >= 25;

    let baseConfidence;
    if (winnerScore >= 100) baseConfidence = 100;
    else if (winnerScore >= 80) baseConfidence = bothPresent ? 60 : 80; // Reduce if ambiguous
    else if (winnerScore >= 60) baseConfidence = bothPresent ? 55 : 60;
    else if (winnerScore >= 40) baseConfidence = bothPresent ? 40 : 40;
    else if (winnerScore >= 25) baseConfidence = 25;
    else baseConfidence = 15;

    return baseConfidence;
  }

  /**
   * Determine quality level and recommended action
   * @param {number} confidence - Confidence percentage
   * @param {Object} scores - Raw scores
   * @returns {Object} Quality assessment with level and action
   */
  static determineQuality(confidence, scores) {
    // Very Low: <25% confidence or very low absolute scores
    if (confidence < 25 || (scores['amazon.com'] < 25 && scores['amazon.eu'] < 25)) {
      return {
        level: 'VERY LOW',
        action: 'reject'
      };
    }

    // Low: 25-39% confidence
    if (confidence < 40) {
      return {
        level: 'LOW',
        action: 'review'
      };
    }

    // Medium: 40-69% confidence
    if (confidence < 70) {
      return {
        level: 'MEDIUM',
        action: 'review'
      };
    }

    // High: 70%+ confidence
    return {
      level: 'HIGH',
      action: 'accept'
    };
  }

  /**
   * Detect EU invoice subtype (business vs consumer)
   * @param {string} text - Preprocessed text
   * @returns {string|null} 'business', 'consumer', or null
   */
  static detectEUSubtype(text) {
    const businessIndicators = [
      /amazon\s+business/i,           // Logo text
      /Geschäftsadresse/,             // Business address field (German)
      /Auftraggeber/,                 // "Client" field (business term)
      /Rechnung\s+an/,                // "Invoice to" (business format)
      /Firma/,                        // Company field
      /USt-IdNr/,                     // VAT number field (business)
      /Steuernummer/,                 // Tax number field (business)
      /\bGmbH\b/i,                    // German business entity (word boundary)
      /\bAG\b/,                       // German stock corporation (exact match)
      /\bUG\b/i,                      // German business form (word boundary)
      /\be\.V\.\b/i,                  // German association (word boundary)
      /\bKGaA\b/i,                    // German business form (word boundary)
      /Dirección comercial/,          // Business address (Spanish)
      /NIF sujeto de IVA/,            // VAT number field (Spanish)
      /Adresse (professionnelle|commerciale)/, // Business address (French)
      /Numéro de TVA/,                // VAT number (French)
      /TVA\s+[A-Z]{2}\d/,             // VAT number pattern (EU format)
      /Facture\s+à/,                  // "Invoice to" (French business)
      /Entreprise/,                   // Company (French)
      /Société/,                      // Company/Society (French)
      /S\.A\.R\.L/,                   // French business entity
      /S\.A\.S/,                      // French business entity
      /IVA\s+ES/,                     // Spanish VAT
      /TVA\s+FR/,                     // French VAT
      /IVA\s+IT/,                     // Italian VAT
      /Partita IVA/,                  // Italian VAT number
      /P\.?I\.?\s+\d/,                // Italian VAT abbreviation
      /società/i,                     // Company (Italian)
      /azienda/i                      // Business (Italian)
    ];

    // Polish business entity patterns that should NOT count when part of Amazon registration
    const polishBusinessPatterns = [
      /SP\.\s*Z\s*O\.O\./,           // Polish business entity
      /ODDZIAŁ\s+W\s+POLSCE/,        // Polish branch
    ];

    const consumerIndicators = [
      /amazon\.de\b/i,                // Consumer domain
      /amazon\.fr\b/i,                // French consumer
      /amazon\.co\.uk\b/i,            // UK consumer
      /Rechnungsadresse(?!.*Geschäftsadresse)/, // Invoice address (not business)
      /Steuerfreie Ausfuhrlieferung/, // Export delivery (often consumer)
      /Privatkunde/,                  // Private customer (German consumer)
      /Endverbraucher/,               // End consumer (German)
      /Lieferanschrift/,              // Delivery address (consumer format)
      /Zahlungsmethode/               // Payment method (consumer)
    ];

    let businessScore = businessIndicators.filter(p => p.test(text)).length;

    // Add Polish patterns only if they appear in business context (not Amazon registration)
    const hasPolishBusinessInContext = polishBusinessPatterns.some(pattern => {
      // Only count if Polish pattern appears WITHOUT Amazon registration context
      return pattern.test(text) && !/Amazon EU S\.à r\.l\.,.*SP\. Z O\.O\. ODDZIAŁ W POLSCE/i.test(text);
    });
    if (hasPolishBusinessInContext) businessScore += 1;
    let consumerScore = consumerIndicators.filter(p => p.test(text)).length;

    // Add German-specific logic
    const hasGermanBusinessTerms = /Geschäftsadresse|USt-IdNr|Steuernummer|Rechnung\s+an|Firma/i.test(text);
    const hasGermanConsumerTerms = /Privatkunde|Endverbraucher/i.test(text);

    // Boost scores based on German-specific terms
    if (hasGermanBusinessTerms) businessScore += 2;
    if (hasGermanConsumerTerms) consumerScore += 2;

    if (businessScore > consumerScore) return 'business';
    if (consumerScore > businessScore) return 'consumer';

    // Fallback: check ASIN position pattern
    // Business: data before ASIN in table format
    // Consumer: data after ASIN on separate lines
    const hasTableStructure = /\|\s*\d+\s*\|.*?ASIN:/s.test(text);
    if (hasTableStructure) return 'business';

    // Additional fallback: check for German business address patterns
    const hasBusinessAddressPattern = /Rechnung\s+an[\s\S]*?\n.*?\n.*?\n/i.test(text);
    if (hasBusinessAddressPattern) return 'business';

    return 'consumer'; // Default fallback
  }
}

module.exports = FormatClassifier;