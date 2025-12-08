/**
 * Light Preprocessor - Stage 1
 *
 * Minimal cleaning to enable reliable format classification.
 * Only fixes issues that would break pattern matching.
 *
 * Pipeline: PDF Text → [HERE] → Format Classifier
 */

class LightPreprocessor {
  /**
   * Apply minimal preprocessing for format detection
   * @param {string} text - Raw PDF text
   * @returns {string} - Lightly cleaned text
   */
  static preprocess(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let processed = text;

    // ONLY fix issues that interfere with format classification
    processed = this.fixCriticalEncoding(processed);
    processed = this.basicWhitespaceNormalization(processed);

    return processed;
  }

  /**
   * Fix ONLY encoding issues that break classification patterns
   * (Euro symbol, German/Spanish characters in format-identifying keywords)
   */
  static fixCriticalEncoding(text) {
    const criticalFixes = {
      // CRITICAL: Euro symbol (format identifier)
      'â‚¬': '€',

      // CRITICAL: German keywords (Rechnung, Rechnungsnummer, Bestellnummer)
      'Ã¶': 'ö',  // "Rechnungsnummer" → "Rechnungsnummer"
      'Ã¼': 'ü',  // Common in German
      'Ã¤': 'ä',  // Common in German
      'ÃŸ': 'ß',  // German sharp s

      // CRITICAL: Spanish keywords (if needed for patterns)
      'Ã±': 'ñ',  // Spanish n-tilde
      'Ã³': 'ó',  // Spanish o-acute
      'Ã­': 'í',  // Spanish i-acute
      'Ã©': 'é',  // French/Spanish e-acute

      // Other common issues that might appear in format-identifying text
      'Ã': 'à',
      'Ã§': 'ç'
    };

    let fixed = text;
    for (const [broken, correct] of Object.entries(criticalFixes)) {
      fixed = fixed.replace(new RegExp(broken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correct);
    }

    return fixed;
  }

  /**
   * Basic whitespace normalization
   * Does NOT remove line breaks or collapse structure
   */
  static basicWhitespaceNormalization(text) {
    let normalized = text;

    // Convert tabs to spaces
    normalized = normalized.replace(/\t/g, ' ');

    // Collapse multiple spaces (but keep line breaks)
    normalized = normalized.replace(/ {2,}/g, ' ');

    // Only remove EXCESSIVE line breaks (4+)
    // Keep structure for format detection
    normalized = normalized.replace(/\n{4,}/g, '\n\n\n');

    return normalized;
  }
}

module.exports = LightPreprocessor;