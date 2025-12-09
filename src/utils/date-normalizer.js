/**
 * Date Normalizer Utility
 *
 * Converts various date formats to ISO format (YYYY-MM-DD)
 * Handles language-specific date formats and edge cases
 */

class DateNormalizer {
  /**
   * Main normalization function
   * @param {string} dateStr - Date string to normalize
   * @param {string} language - Language code (en, de, fr, es, it)
   * @returns {string|null} - ISO date string (YYYY-MM-DD) or null if invalid
   */
  static normalize(dateStr, language = 'en') {
    if (!dateStr || typeof dateStr !== 'string') return null;

    const trimmed = dateStr.trim();
    if (!trimmed) return null;

    // Try different parsing strategies
    let date = this.parseEnglishDate(trimmed);
    if (date) return this.formatISO(date);

    if (language === 'de' || language === 'DE') {
      date = this.parseGermanDate(trimmed);
      if (date) return this.formatISO(date);
    }

    if (language === 'fr' || language === 'FR') {
      date = this.parseFrenchDate(trimmed);
      if (date) return this.formatISO(date);
    }

    if (language === 'es' || language === 'ES') {
      date = this.parseSpanishDate(trimmed);
      if (date) return this.formatISO(date);
    }

    if (language === 'it' || language === 'IT') {
      date = this.parseItalianDate(trimmed);
      if (date) return this.formatISO(date);
    }

    // Fallback: try standard formats
    date = this.parseStandardFormats(trimmed);
    if (date) return this.formatISO(date);

    return null;
  }

  /**
   * Parse English date formats
   * @param {string} dateStr - Date string
   * @returns {Date|null} - Parsed date object or null
   */
  static parseEnglishDate(dateStr) {
    const patterns = [
      // "November 8, 2025"
      /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/,
      // "8 November 2025"
      /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/,
      // "November 8 2025"
      /^([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})$/,
    ];

    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        const [, part1, part2, year] = match;
        const monthName = pattern.source.includes('A-Za-z') ? (match[1] || match[2]) : null;
        const day = pattern.source.includes('A-Za-z') ? (match[2] || match[1]) : null;

        if (monthName && day && year) {
          const month = this.getMonthNumber(monthName, 'en');
          if (month) {
            return new Date(parseInt(year), month - 1, parseInt(day));
          }
        }
      }
    }

    return null;
  }

  /**
   * Parse German date formats
   * @param {string} dateStr - Date string
   * @returns {Date|null} - Parsed date object or null
   */
  static parseGermanDate(dateStr) {
    const patterns = [
      // "29 November 2025"
      { pattern: /^(\d{1,2})\.?\s*([A-Za-zäöüß]+)\s+(\d{4})$/, type: 'monthName' },
      // "29. November 2025"
      { pattern: /^(\d{1,2})\.\s*([A-Za-zäöüß]+)\s+(\d{4})$/, type: 'monthName' },
      // DD.MM.YYYY
      { pattern: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, type: 'numeric' },
    ];

    for (const { pattern, type } of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        if (type === 'monthName') {
          // Month name format
          const [, day, monthName, year] = match;
          const month = this.getMonthNumber(monthName, 'de');
          if (month) {
            return new Date(parseInt(year), month - 1, parseInt(day));
          }
        } else if (type === 'numeric') {
          // DD.MM.YYYY format
          const [, day, month, year] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      }
    }

    return null;
  }

  /**
   * Parse French date formats
   * @param {string} dateStr - Date string
   * @returns {Date|null} - Parsed date object or null
   */
  static parseFrenchDate(dateStr) {
    const patterns = [
      // "8 novembre 2025" or "1er novembre 2025"
      /^(\d{1,2})(?:er)?\s+([a-zàâäéèêëïîôöùûüÿç]+)\s+(\d{4})$/i,
      // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // DD.MM.YYYY
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    ];

    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        if (match.length === 4) {
          const [, day, monthPart, year] = match;
          // Check if monthPart is numeric (DD/MM/YYYY or DD.MM.YYYY patterns)
          if (!isNaN(parseInt(monthPart))) {
            const month = parseInt(monthPart);
            return new Date(parseInt(year), month - 1, parseInt(day));
          } else {
            // Month name format
            const month = this.getMonthNumber(monthPart, 'fr');
            if (month) {
              return new Date(parseInt(year), month - 1, parseInt(day));
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Parse Spanish date formats
   * @param {string} dateStr - Date string
   * @returns {Date|null} - Parsed date object or null
   */
  static parseSpanishDate(dateStr) {
    const patterns = [
      // "30 noviembre 2025"
      /^(\d{1,2})\s+[a-záéíóúñ]+\s+(\d{4})$/i,
      // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // DD.MM.YYYY
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    ];

    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        if (match.length === 4) {
          const [, day, monthPart, year] = match;
          if (monthPart.includes('/') || monthPart.includes('.')) {
            const month = monthPart.includes('/') ? match[2] : match[2];
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            const month = this.getMonthNumber(monthPart, 'es');
            if (month) {
              return new Date(parseInt(year), month - 1, parseInt(day));
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Parse Italian date formats
   * @param {string} dateStr - Date string
   * @returns {Date|null} - Parsed date object or null
   */
  static parseItalianDate(dateStr) {
    const patterns = [
      // "29 novembre 2025"
      /^(\d{1,2})\s+[a-zàèéìíîòóùú]+\s+(\d{4})$/i,
      // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // DD.MM.YYYY
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    ];

    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        const [, day, monthPart, year] = match;
        // Check if monthPart is numeric (DD/MM/YYYY or DD.MM.YYYY patterns)
        if (!isNaN(parseInt(monthPart))) {
          const month = parseInt(monthPart);
          return new Date(parseInt(year), month - 1, parseInt(day));
        } else {
          const month = this.getMonthNumber(monthPart, 'it');
          if (month) {
            return new Date(parseInt(year), month - 1, parseInt(day));
          }
        }
      }
    }

    return null;
  }

  /**
   * Parse standard date formats (ISO, US, etc.)
   * @param {string} dateStr - Date string
   * @returns {Date|null} - Parsed date object or null
   */
  static parseStandardFormats(dateStr) {
    // Try native Date parsing for standard formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      // Validate the date makes sense
      if (date.getFullYear() >= 2000 && date.getFullYear() <= 2030) {
        return date;
      }
    }

    // Try MM/DD/YYYY format
    const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const [, month, day, year] = usMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    return null;
  }

  /**
   * Get month number from month name
   * @param {string} monthName - Month name
   * @param {string} language - Language code
   * @returns {number|null} - Month number (1-12) or null
   */
  static getMonthNumber(monthName, language) {
    const months = {
      en: {
        'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
        'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
      },
      de: {
        'januar': 1, 'februar': 2, 'märz': 3, 'april': 4, 'mai': 5, 'juni': 6,
        'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'dezember': 12
      },
      fr: {
        'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6,
        'juillet': 7, 'août': 8, 'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
      },
      es: {
        'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
        'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
      },
      it: {
        'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4, 'maggio': 5, 'giugno': 6,
        'luglio': 7, 'agosto': 8, 'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12
      }
    };

    const langMonths = months[language.toLowerCase()];
    if (!langMonths) return null;

    const lowerMonth = monthName.toLowerCase();
    return langMonths[lowerMonth] || null;
  }

  /**
   * Format date as ISO string (YYYY-MM-DD)
   * @param {Date} date - Date object
   * @returns {string} - ISO date string
   */
  static formatISO(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Validate if a date string represents a valid date
   * @param {string} dateStr - Date string to validate
   * @param {string} language - Language code
   * @returns {boolean} - True if valid date
   */
  static isValidDate(dateStr, language = 'en') {
    const normalized = this.normalize(dateStr, language);
    return normalized !== null;
  }
}

module.exports = DateNormalizer;