/**
 * @deprecated Use light-preprocessor.js → format-classifier.js → format-specific-preprocessor.js pipeline instead
 *
 * This file kept for backwards compatibility only.
 */

class InvoicePreprocessor {
  /**
   * Main preprocessing function that applies all cleaning steps
   * @param {string} text - Raw PDF text content
   * @returns {string} - Cleaned and normalized text
   * @deprecated Use new pipeline: light-preprocessor → format-classifier → format-specific-preprocessor
   */
  static preprocess(text) {
    console.warn('⚠️  Using deprecated InvoicePreprocessor. Update to new pipeline.');

    // Fallback to old behavior
    const FormatSpecificPreprocessor = require('./format-specific-preprocessor.js');
    return FormatSpecificPreprocessor.preprocess(text, 'amazon.eu'); // Default to EU
  }

  /**
   * Fix UTF-8 encoding issues common in PDF extraction
   * @param {string} text - Text with potential encoding issues
   * @returns {string} - Text with fixed encoding
   */
  static fixEncoding(text) {
    const encodingFixes = {
      // Common UTF-8 mojibake patterns
      'Ã©': 'é',     // e with acute accent
      'Ã¨': 'è',     // e with grave accent
      'Ãª': 'ê',     // e with circumflex
      'Ã«': 'ë',     // e with diaeresis
      'Ã¡': 'á',     // a with acute accent
      'Ã¢': 'â',     // a with circumflex
      'Ã¤': 'ä',     // a with diaeresis
      'Ã£': 'ã',     // a with tilde
      'Ã¥': 'å',     // a with ring above
      'Ã§': 'ç',     // c with cedilla
      'Ã­': 'í',     // i with acute accent
      'Ã®': 'î',     // i with circumflex
      'Ã¯': 'ï',     // i with diaeresis
      'Ã³': 'ó',     // o with acute accent
      'Ã´': 'ô',     // o with circumflex
      'Ã¶': 'ö',     // o with diaeresis
      'Ãµ': 'õ',     // o with tilde
      'Ãº': 'ú',     // u with acute accent
      'Ã»': 'û',     // u with circumflex
      'Ã¼': 'ü',     // u with diaeresis
      'Ã±': 'ñ',     // n with tilde
      'Å¥': 'ť',     // t with caron
      'Åˆ': 'ň',     // n with caron
      'Å™': 'ř',     // r with caron
      'Å¡': 'š',     // s with caron
      'Å¾': 'ž',     // z with caron
      'â‚¬': '€',     // euro symbol
      'â€š': '‚',     // single low-9 quotation mark
      'â€ž': '„',     // double low-9 quotation mark
      'â€¦': '…',     // horizontal ellipsis
      'â€': '†',      // dagger
      'â€¡': '‡',     // double dagger
      'â€°': '‰',     // per mille sign
      'â€¹': '‹',     // single left-pointing angle quotation mark
      'â€º': '›',     // single right-pointing angle quotation mark
      'â€': '™',      // trade mark sign
      'â€': '♪',      // eighth note
      'â€': '♫',      // beamed eighth notes
      'â€': 'OK',     // check mark (converted to safe text)
      'Ã': 'à',       // a with grave accent (common pattern)
      'Æ': 'Æ',       // AE ligature (keep as is)
      'æ': 'æ',       // ae ligature (keep as is)
      'Å': 'Å',       // A with ring above (keep as is)
      'å': 'å',       // a with ring above (already handled above)
      // Additional common PDF encoding issues
      'â€"': '"',     // left double quotation mark
      'â€"': '"',     // right double quotation mark
      'â€': "'",     // left single quotation mark
      'â€': "'",     // right single quotation mark
      'â€"': '–',     // en dash
      'â€"': '—',     // em dash
      'â€': '•',     // bullet
    };

    let fixed = text;
    for (const [broken, correct] of Object.entries(encodingFixes)) {
      fixed = fixed.replace(new RegExp(broken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correct);
    }

    return fixed;
  }

  /**
   * Normalize whitespace characters while preserving important line breaks
   * @param {string} text - Text with inconsistent whitespace
   * @returns {string} - Text with normalized whitespace
   */
  static normalizeWhitespace(text) {
    // For invoice parsing, we need to preserve line breaks around important elements
    // like ASIN, prices, and item descriptions to maintain structure for extraction

    let normalized = text;

    // First, normalize tabs and other whitespace to spaces, but keep line breaks
    normalized = normalized.replace(/[\t\f\v\r]+/g, ' ');

    // Remove multiple consecutive spaces but preserve single spaces and line breaks
    normalized = normalized.replace(/ {2,}/g, ' ');

    // Don't collapse all line breaks - preserve them for structure
    // Only remove excessive line breaks (more than 2 consecutive)
    normalized = normalized.replace(/\n{3,}/g, '\n\n');

    // Trim each line individually
    normalized = normalized.split('\n')
      .map(line => line.trim())
      .join('\n');

    // Preserve up to 1 empty line at start and end for structural separation
    // This helps maintain table structure in Spanish invoices
    normalized = normalized.replace(/^\n{2,}/, '\n').replace(/\n{2,}$/, '\n');

    return normalized;
  }

  /**
   * Fix words that are hyphenated and split across lines
   * @param {string} text - Text with hyphenated line breaks
   * @returns {string} - Text with words reconstructed
   */
  static fixLineBreaks(text) {
    // Common patterns for hyphenated words split across lines
    // Pattern: word-\nword → wordword
    // But avoid removing hyphens that are part of compound words or phone numbers

    // First, let's handle the most common case: hyphen at end of line followed by newline
    let fixed = text.replace(/-\s*\n\s*/g, '');

    // Handle cases where there might be extra spaces
    fixed = fixed.replace(/-\s+\n\s+/g, '');

    // Handle cases where the hyphen might be part of a longer word
    // This is tricky - we want to avoid breaking legitimate hyphens
    // For now, we'll be conservative and only fix obvious line break cases

    return fixed;
  }

  /**
   * Remove PDF-specific artifacts and noise
   * @param {string} text - Text with PDF artifacts
   * @returns {string} - Clean text without artifacts
   */
  static removePdfArtifacts(text) {
    let cleaned = text;

    // Remove page headers/footers (common PDF artifacts)
    // Pattern: "Page X of Y" or similar
    cleaned = cleaned.replace(/Page\s+\d+\s+of\s+\d+/gi, '');
    cleaned = cleaned.replace(/Seite\s+\d+\s*von\s+\d+/gi, ''); // German
    cleaned = cleaned.replace(/Página\s+\d+\s+de\s+\d+/gi, ''); // Spanish

    // Remove form field artifacts (common in invoice PDFs)
    // Only remove empty brackets, checkboxes, or underscore lines (typical PDF form fields)
    cleaned = cleaned.replace(/\[\s*\]/g, ''); // Empty brackets [ ]
    cleaned = cleaned.replace(/\[\s*X\s*\]/gi, ''); // Checked boxes [X]
    cleaned = cleaned.replace(/\[\s*_{3,}\s*\]/g, ''); // Underscore lines [___]

    // Remove excessive spaces again after artifact removal
    cleaned = cleaned.replace(/ {2,}/g, ' ').trim();

    return cleaned;
  }
}

module.exports = InvoicePreprocessor;