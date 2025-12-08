/**
 * Format-Specific Preprocessor - Stage 3
 *
 * Comprehensive cleaning based on detected format.
 * Runs AFTER format classification.
 *
 * Pipeline: Format Classifier → [HERE] → Language Detector → Parser
 */

class FormatSpecificPreprocessor {
  /**
   * Apply format-specific preprocessing
   * @param {string} text - Lightly preprocessed text
   * @param {string} format - Detected format ('amazon.com' or 'amazon.eu')
   * @returns {string} - Fully cleaned text
   */
  static preprocess(text, format) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let processed = text;

    // Apply ALL encoding fixes (comprehensive)
    processed = this.fixAllEncoding(processed);

    // Apply format-specific cleaning
    if (format === 'amazon.com') {
      processed = this.cleanAmazonCom(processed);
    } else if (format === 'amazon.eu') {
      processed = this.cleanAmazonEU(processed);
    } else {
      // Unknown format - apply generic cleaning
      processed = this.cleanGeneric(processed);
    }

    // Final cleanup
    processed = this.finalCleanup(processed);

    return processed;
  }

  /**
   * Comprehensive UTF-8 encoding fixes (ALL from your original script)
   */
  static fixAllEncoding(text) {
    const encodingFixes = {
      // Common UTF-8 mojibake patterns
      'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã«': 'ë',
      'Ã¡': 'á', 'Ã¢': 'â', 'Ã¤': 'ä', 'Ã£': 'ã', 'Ã¥': 'å',
      'Ã§': 'ç',
      'Ã­': 'í', 'Ã®': 'î', 'Ã¯': 'ï',
      'Ã³': 'ó', 'Ã´': 'ô', 'Ã¶': 'ö', 'Ãµ': 'õ',
      'Ãº': 'ú', 'Ã»': 'û', 'Ã¼': 'ü',
      'Ã±': 'ñ',
      'Å¥': 'ť', 'Åˆ': 'ň', 'Å™': 'ř', 'Å¡': 'š', 'Å¾': 'ž',
      'â‚¬': '€',
      'â€š': '‚', 'â€ž': '„', 'â€¦': '…',
      'â€': '†', 'â€¡': '‡', 'â€°': '‰',
      'â€¹': '‹', 'â€º': '›',
      'â€': '™', 'â€': '♪', 'â€': '♫', 'â€': '✓',
      'Ã': 'à',
      'Æ': 'Æ', 'æ': 'æ', 'Å': 'Å', 'å': 'å',
      'â€"': '"', 'â€"': '"',
      'â€': "'", 'â€': "'",
      'â€"': '–', 'â€"': '—',
      'â€': '•'
    };

    let fixed = text;
    for (const [broken, correct] of Object.entries(encodingFixes)) {
      fixed = fixed.replace(new RegExp(broken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correct);
    }

    return fixed;
  }

  /**
   * Amazon.com specific cleaning
   */
  static cleanAmazonCom(text) {
    let cleaned = text;

    // Remove page markers (amazon.com specific)
    cleaned = cleaned.replace(/Page\s+\d+\s+of\s+\d+/gi, '');

    // Remove footer/legal text
    cleaned = cleaned.replace(/Conditions of Use \| Privacy Notice.*$/gm, '');

    // Fix hyphenated line breaks (common in amazon.com product names)
    cleaned = cleaned.replace(/-\s*\n\s*/g, '');

    // Remove seller profile links
    cleaned = cleaned.replace(/\(seller profile\)/gi, '');

    // Normalize dashes used as separators
    cleaned = cleaned.replace(/-----+/g, '');

    // Remove form fields (empty brackets, checkboxes)
    cleaned = cleaned.replace(/\[\s*\]/g, '');
    cleaned = cleaned.replace(/\[\s*X\s*\]/gi, '');

    return cleaned;
  }

  /**
   * Amazon.eu specific cleaning
   */
  static cleanAmazonEU(text) {
    let cleaned = text;

    // Remove page markers (multilingual)
    cleaned = cleaned.replace(/Seite\s+\d+\s*von\s+\d+/gi, '');  // German
    cleaned = cleaned.replace(/Página\s+\d+\s+de\s+\d+/gi, '');  // Spanish
    cleaned = cleaned.replace(/Page\s+\d+\s+sur\s+\d+/gi, '');   // French
    cleaned = cleaned.replace(/Pagina\s+\d+\s+di\s+\d+/gi, '');  // Italian

    // Remove legal boilerplate (EU invoices have lots of this)
    cleaned = cleaned.replace(/Amazon EU S\.à r\.l\. - 38 avenue.*?(?=\n\n|\n[A-Z]|$)/gs, '');
    cleaned = cleaned.replace(/Sitz der Gesellschaft:.*?Stammkapital:.*?EUR/gs, '');
    cleaned = cleaned.replace(/eingetragen im Luxemburgischen.*?(?=\n)/g, '');

    // Fix hyphenated line breaks (more aggressive for EU multi-line product names)
    cleaned = cleaned.replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2');

    // Remove VAT footnotes
    cleaned = cleaned.replace(/\(\d+\)\s*Steuerfreie innergemeinschaftliche.*?(?=\n|$)/g, '');

    // Normalize Euro spacing (37,37€ → 37,37 €)
    cleaned = cleaned.replace(/(\d+,\d{2})€/g, '$1 €');

    // Remove form fields
    cleaned = cleaned.replace(/\[\s*\]/g, '');
    cleaned = cleaned.replace(/\[\s*X\s*\]/gi, '');
    cleaned = cleaned.replace(/\[\s*_{3,}\s*\]/g, '');

    return cleaned;
  }

  /**
   * Generic cleaning for unknown formats
   */
  static cleanGeneric(text) {
    let cleaned = text;

    // Remove common page markers
    cleaned = cleaned.replace(/Page\s+\d+\s+(of|von|de|sur|di)\s+\d+/gi, '');

    // Fix basic hyphenated line breaks
    cleaned = cleaned.replace(/-\s*\n\s*/g, '');

    // Remove form fields
    cleaned = cleaned.replace(/\[\s*\]/g, '');
    cleaned = cleaned.replace(/\[\s*X\s*\]/gi, '');

    return cleaned;
  }

  /**
   * Final cleanup (from your original script)
   */
  static finalCleanup(text) {
    let cleaned = text;

    // Normalize whitespace more aggressively now
    cleaned = cleaned.replace(/[\t\f\v\r]+/g, ' ');
    cleaned = cleaned.replace(/ {2,}/g, ' ');

    // Reduce excessive line breaks (more than 2)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Trim each line
    cleaned = cleaned.split('\n')
      .map(line => line.trim())
      .join('\n');

    // Clean up start/end
    cleaned = cleaned.replace(/^\n{2,}/, '\n').replace(/\n{2,}$/, '\n');
    cleaned = cleaned.trim();

    return cleaned;
  }
}

module.exports = FormatSpecificPreprocessor;