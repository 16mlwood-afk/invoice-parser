/**
 * Parser Factory
 *
 * Orchestrates the three-stage pipeline:
 * PDF Text → [1] Preprocessor → [2] Language Detector → [3] Language-Specific Parser → Invoice Data
 *
 * Responsibilities:
 * - Coordinate the three-stage pipeline
 * - Instantiate appropriate parser based on language detection
 * - Handle fallback scenarios
 * - Provide unified interface for invoice parsing
 */

const InvoicePreprocessor = require('./preprocessor');
const LanguageDetector = require('./language-detector');
const SpanishParser = require('./parsers/spanish-parser');
const GermanParser = require('./parsers/german-parser');
const EnglishParser = require('./parsers/english-parser');
const FrenchParser = require('./parsers/french-parser');
const ItalianParser = require('./parsers/italian-parser');
const JapaneseParser = require('./parsers/japanese-parser');
const CanadianFrenchParser = require('./parsers/canadian-french-parser');
const AustralianParser = require('./parsers/australian-parser');
const SwissParser = require('./parsers/swiss-parser');
const UKParser = require('./parsers/uk-parser');
const BaseParser = require('./parsers/base-parser');

class ParserFactory {
  /**
   * Parse invoice using the three-stage pipeline
   * @param {string} rawText - Raw PDF text content
   * @param {Object} options - Parsing options
   * @returns {Object} - Parsed invoice data or null
   */
  static async parseInvoice(rawText, options = {}) {
    const startTime = Date.now();

    try {
      // Stage 1: Preprocess the text
      const preprocessStart = Date.now();
      const preprocessedText = InvoicePreprocessor.preprocess(rawText);
      const preprocessTime = Date.now() - preprocessStart;

      if (options.debug) {
        console.log('🔧 Preprocessed text length:', preprocessedText.length);
        console.log('🔧 Preprocessed text sample:', preprocessedText.substring(0, 200) + '...');
      }

      // Stage 2: Detect language
      const languageStart = Date.now();
      const languageDetection = LanguageDetector.detect(preprocessedText);
      const languageTime = Date.now() - languageStart;

      if (options.debug) {
        console.log('🌍 Language detection:', languageDetection);
      }

      // Stage 3: Parse with appropriate language-specific parser
      const parseStart = Date.now();
      const parser = this.createParser(languageDetection.language);
      const invoice = parser.extract(preprocessedText);
      const parseTime = Date.now() - parseStart;

      const totalTime = Date.now() - startTime;

      // Calculate extraction success metrics
      const extractionMetrics = this.calculateExtractionMetrics(invoice);

      // Add metadata
      invoice.languageDetection = languageDetection;
      invoice.processingMetadata = {
        pipeline: 'three-stage',
        preprocessing: 'completed',
        languageDetection: languageDetection.language,
        parser: parser.constructor.name,
        timestamp: new Date().toISOString()
      };

      // Add performance metrics
      invoice.performanceMetrics = {
        totalProcessingTime: totalTime,
        preprocessingTime: preprocessTime,
        languageDetectionTime: languageTime,
        parsingTime: parseTime,
        extractionSuccess: extractionMetrics,
        languageConfidence: languageDetection.confidence,
        textLength: rawText.length,
        processedTextLength: preprocessedText.length
      };

      if (options.debug) {
        console.log('✅ Parsing completed with', parser.constructor.name);
        console.log('📊 Performance:', `${totalTime}ms total, ${languageDetection.confidence} confidence`);
      }

      return invoice;

    } catch (error) {
      const totalTime = Date.now() - startTime;

      console.error('❌ Parser pipeline failed:', error.message);

      // Fallback to base parser for error recovery
      try {
        const fallbackParser = new BaseParser('Unknown', 'XX');
        const preprocessedText = InvoicePreprocessor.preprocess(rawText);
        const partialInvoice = fallbackParser.extractPartialInvoiceData(preprocessedText, error);

        if (partialInvoice.extractionMetadata.usable) {
          console.log('🔄 Fallback parsing successful');

          // Add performance metrics to fallback result
          partialInvoice.performanceMetrics = {
            totalProcessingTime: Date.now() - startTime,
            fallbackUsed: true,
            originalError: error.message,
            extractionSuccess: this.calculateExtractionMetrics(partialInvoice)
          };

          return partialInvoice;
        }
      } catch (fallbackError) {
        console.error('❌ Fallback parsing also failed:', fallbackError.message);
      }

      return null;
    }
  }

  /**
   * Create appropriate parser based on detected language
   * @param {string} language - Detected language code (ES, DE, EN, FR, IT, JP, CA, AU, CH, GB, etc.)
   * @returns {BaseParser} - Language-specific parser instance
   */
  static createParser(language) {
    switch (language) {
      case 'ES':
        return new SpanishParser();
      case 'DE':
        return new GermanParser();
      case 'EN':
        return new EnglishParser();
      case 'FR':
        return new FrenchParser();
      case 'IT':
        return new ItalianParser();
      case 'JP':
        return new JapaneseParser();
      case 'CA':
        return new CanadianFrenchParser();
      case 'AU':
        return new AustralianParser();
      case 'CH':
        return new SwissParser();
      case 'GB':
        return new UKParser();
      default:
        // Fallback to English parser for unknown languages
        console.warn(`⚠️  Unknown language '${language}', falling back to English parser`);
        return new EnglishParser();
    }
  }

  /**
   * Get available parsers
   * @returns {Object} - Map of language codes to parser classes
   */
  static getAvailableParsers() {
    return {
      'ES': SpanishParser,
      'DE': GermanParser,
      'EN': EnglishParser,
      'FR': FrenchParser,
      'IT': ItalianParser,
      'JP': JapaneseParser,
      'CA': CanadianFrenchParser,
      'AU': AustralianParser,
      'CH': SwissParser,
      'GB': UKParser
    };
  }

  /**
   * Test parsing with all available parsers (for debugging)
   * @param {string} rawText - Raw PDF text content
   * @returns {Object} - Results from all parsers
   */
  static async testAllParsers(rawText) {
    const preprocessedText = InvoicePreprocessor.preprocess(rawText);
    const results = {};

    for (const [code, ParserClass] of Object.entries(this.getAvailableParsers())) {
      try {
        const parser = new ParserClass();
        const invoice = parser.extract(preprocessedText);
        results[code] = {
          success: true,
          invoice,
          language: parser.language,
          country: parser.country
        };
      } catch (error) {
        results[code] = {
          success: false,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Validate parser pipeline health
   * @returns {Object} - Health check results
   */
  static healthCheck() {
    const results = {
      overall: 'healthy',
      components: {}
    };

    try {
      // Test preprocessor
      const testText = 'Test Ã© text with € symbols';
      const processed = InvoicePreprocessor.preprocess(testText);
      results.components.preprocessor = {
        status: 'healthy',
        details: `Processed "${testText}" to "${processed}"`
      };
    } catch (error) {
      results.components.preprocessor = {
        status: 'unhealthy',
        error: error.message
      };
      results.overall = 'unhealthy';
    }

    try {
      // Test language detector
      const detection = LanguageDetector.detect('Test invoice text');
      results.components.languageDetector = {
        status: 'healthy',
        details: `Detected: ${detection.language} (${detection.confidence})`
      };
    } catch (error) {
      results.components.languageDetector = {
        status: 'unhealthy',
        error: error.message
      };
      results.overall = 'unhealthy';
    }

    // Test parsers
    const parsers = this.getAvailableParsers();
    results.components.parsers = {};

    for (const [code, ParserClass] of Object.entries(parsers)) {
      try {
        const parser = new ParserClass();
        results.components.parsers[code] = {
          status: 'healthy',
          language: parser.language,
          country: parser.country
        };
      } catch (error) {
        results.components.parsers[code] = {
          status: 'unhealthy',
          error: error.message
        };
        results.overall = 'unhealthy';
      }
    }

    return results;
  }

  /**
   * Calculate extraction success metrics
   * @param {Object} invoice - Parsed invoice data
   * @returns {Object} - Extraction success metrics
   */
  static calculateExtractionMetrics(invoice) {
    if (!invoice) {
      return {
        overall: 0,
        fields: {
          orderNumber: false,
          orderDate: false,
          items: false,
          subtotal: false,
          tax: false,
          shipping: false,
          total: false
        }
      };
    }

    const metrics = {
      fields: {
        orderNumber: !!(invoice.orderNumber && invoice.orderNumber.trim()),
        orderDate: !!(invoice.orderDate && invoice.orderDate.trim()),
        items: !!(invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0),
        subtotal: !!(invoice.subtotal && invoice.subtotal.trim()),
        tax: !!(invoice.tax && invoice.tax.trim()),
        shipping: !!(invoice.shipping && invoice.shipping.trim()),
        total: !!(invoice.total && invoice.total.trim())
      }
    };

    // Calculate overall success rate
    const successfulFields = Object.values(metrics.fields).filter(Boolean).length;
    const totalFields = Object.keys(metrics.fields).length;
    metrics.overall = successfulFields / totalFields;

    // Add item-level metrics
    if (metrics.fields.items) {
      const itemsWithPrices = invoice.items.filter(item =>
        item.price && item.price.trim() && item.description && item.description.trim()
      );
      metrics.itemsDetail = {
        totalItems: invoice.items.length,
        itemsWithPrices: itemsWithPrices.length,
        itemsWithDescriptions: invoice.items.filter(item => item.description && item.description.trim()).length
      };
    }

    return metrics;
  }

  /**
   * Generate performance report for multiple invoices
   * @param {Array} invoices - Array of parsed invoice results
   * @returns {Object} - Comprehensive performance report
   */
  static generatePerformanceReport(invoices) {
    if (!invoices || !Array.isArray(invoices)) {
      return { error: 'No invoices provided' };
    }

    const validInvoices = invoices.filter(inv => inv && !inv.error);
    const totalInvoices = invoices.length;
    const successfulInvoices = validInvoices.length;

    const report = {
      summary: {
        totalInvoices,
        successfulInvoices,
        failedInvoices: totalInvoices - successfulInvoices,
        successRate: successfulInvoices / totalInvoices
      },
      performance: {
        averageProcessingTime: 0,
        minProcessingTime: Infinity,
        maxProcessingTime: 0,
        totalProcessingTime: 0
      },
      extraction: {
        averageExtractionSuccess: 0,
        fieldSuccessRates: {
          orderNumber: 0,
          orderDate: 0,
          items: 0,
          subtotal: 0,
          tax: 0,
          shipping: 0,
          total: 0
        }
      },
      languages: {},
      errors: []
    };

    // Process each invoice
    for (const invoice of validInvoices) {
      if (invoice.performanceMetrics) {
        const perf = invoice.performanceMetrics;

        // Processing time stats
        report.performance.totalProcessingTime += perf.totalProcessingTime;
        report.performance.minProcessingTime = Math.min(report.performance.minProcessingTime, perf.totalProcessingTime);
        report.performance.maxProcessingTime = Math.max(report.performance.maxProcessingTime, perf.totalProcessingTime);

        // Extraction success stats
        if (perf.extractionSuccess) {
          report.extraction.averageExtractionSuccess += perf.extractionSuccess.overall;

          // Field-level success rates
          Object.keys(perf.extractionSuccess.fields).forEach(field => {
            if (perf.extractionSuccess.fields[field]) {
              report.extraction.fieldSuccessRates[field]++;
            }
          });
        }
      }

      // Language detection stats
      if (invoice.languageDetection) {
        const lang = invoice.languageDetection.language;
        if (!report.languages[lang]) {
          report.languages[lang] = { count: 0, totalConfidence: 0 };
        }
        report.languages[lang].count++;
        report.languages[lang].totalConfidence += invoice.languageDetection.confidence;
      }
    }

    // Calculate averages
    if (successfulInvoices > 0) {
      report.performance.averageProcessingTime = report.performance.totalProcessingTime / successfulInvoices;
      report.extraction.averageExtractionSuccess = report.extraction.averageExtractionSuccess / successfulInvoices;

      // Convert field counts to rates
      Object.keys(report.extraction.fieldSuccessRates).forEach(field => {
        report.extraction.fieldSuccessRates[field] = report.extraction.fieldSuccessRates[field] / successfulInvoices;
      });

      // Calculate average confidence per language
      Object.keys(report.languages).forEach(lang => {
        report.languages[lang].averageConfidence = report.languages[lang].totalConfidence / report.languages[lang].count;
      });
    }

    // Handle edge cases
    if (report.performance.minProcessingTime === Infinity) {
      report.performance.minProcessingTime = 0;
    }

    // Collect errors
    const failedInvoices = invoices.filter(inv => !inv || inv.error);
    report.errors = failedInvoices.map(inv => inv ? inv.error : 'Unknown error');

    return report;
  }
}

module.exports = ParserFactory;