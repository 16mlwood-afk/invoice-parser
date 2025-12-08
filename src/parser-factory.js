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

const LightPreprocessor = require('./preprocessors/light-preprocessor');
const FormatSpecificPreprocessor = require('./preprocessors/format-specific-preprocessor');
const LanguageDetector = require('./language-detector');
const FormatClassifier = require('./format-classifier');
const USParser = require('./parsers/us-parser');
const EUBusinessParser = require('./parsers/eu-business-parser');
const EUConsumerParser = require('./parsers/eu-consumer-parser');
// Fallback parsers
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
   * Classify the format of invoice text
   * @param {string} text - Preprocessed text
   * @returns {Object} - Format classification result
   */
  static classifyFormat(text) {
    try {
      return FormatClassifier.classify(text);
    } catch (error) {
      console.warn('Format classification failed:', error.message);
      return null;
    }
  }

  /**
   * Parse invoice using the three-stage pipeline
   * @param {string} rawText - Raw PDF text content
   * @param {Object} options - Parsing options
   * @returns {Object} - Parsed invoice data or null
   */
  static async parseInvoice(rawText, options = {}) {
    const startTime = Date.now();

    try {
      // Stage 1: Light preprocessing
      const preprocessStart = Date.now();
      const lightProcessedText = LightPreprocessor.preprocess(rawText);

      // Stage 2: Classify format
      const formatClassification = this.classifyFormat(lightProcessedText);

      // Stage 3: Format-specific preprocessing
      const preprocessedText = FormatSpecificPreprocessor.preprocess(lightProcessedText, formatClassification?.format || 'amazon.com');
      const preprocessTime = Date.now() - preprocessStart;

      if (options.debug) {
        console.log('🔧 Preprocessed text length:', preprocessedText.length);
        console.log('🔧 Preprocessed text sample:', preprocessedText.substring(0, 200) + '...');
        console.log('🎯 Format classification:', formatClassification);
      }

      // Stage 4: Route to appropriate format-specific parser
      const routingStart = Date.now();
      const parser = this.createParserFromClassification(formatClassification);

      // Fallback to language detection if format routing fails
      let languageDetection = null;
      let fallbackUsed = false;

      if (!parser) {
        console.log('🔄 Format routing failed, falling back to language detection');
        languageDetection = LanguageDetector.detect(preprocessedText);
        fallbackUsed = true;

        if (options.debug) {
          console.log('🌍 Language detection (fallback):', languageDetection);
        }
      }

      const routingTime = Date.now() - routingStart;

      // Stage 5: Parse with appropriate parser
      const parseStart = Date.now();
      const invoice = parser ? parser.extract(preprocessedText, {
        format: formatClassification?.format,
        subtype: formatClassification?.subtype,
        classification: formatClassification
      }) : this.createParser(languageDetection.language).extract(preprocessedText, {
        format: formatClassification?.format,
        language: languageDetection.language
      });
      const parseTime = Date.now() - parseStart;

      const totalTime = Date.now() - startTime;

      // Calculate extraction success metrics
      const extractionMetrics = this.calculateExtractionMetrics(invoice);

      // Add metadata
      if (languageDetection) {
        invoice.languageDetection = languageDetection;
      }
      invoice.formatClassification = formatClassification;
      invoice.processingMetadata = {
        pipeline: fallbackUsed ? 'legacy-fallback' : 'format-routing',
        lightPreprocessing: 'completed',
        formatClassification: formatClassification?.format || 'unknown',
        subtypeClassification: formatClassification?.subtype || 'none',
        formatSpecificPreprocessing: 'completed',
        routingMethod: fallbackUsed ? 'language-fallback' : 'format-routing',
        parser: parser ? parser.constructor.name : 'unknown',
        timestamp: new Date().toISOString()
      };

      // Add performance metrics
      invoice.performanceMetrics = {
        totalProcessingTime: totalTime,
        preprocessingTime: preprocessTime,
        routingTime: routingTime,
        parsingTime: parseTime,
        extractionSuccess: extractionMetrics,
        languageConfidence: languageDetection?.confidence || 0,
        textLength: rawText.length,
        processedTextLength: preprocessedText.length
      };

      if (options.debug) {
        console.log('✅ Parsing completed with', parser ? parser.constructor.name : 'unknown parser');
        console.log('📊 Performance:', `${totalTime}ms total`);
      }

      return invoice;

    } catch (error) {
      const totalTime = Date.now() - startTime;

      console.error('❌ Parser pipeline failed:', error.message);

      // Fallback to base parser for error recovery
      try {
        const fallbackParser = new BaseParser('Unknown', 'XX');

        // Use pipeline for fallback preprocessing
        const lightText = LightPreprocessor.preprocess(rawText);
        const classification = this.classifyFormat(lightText);
        const preprocessedText = FormatSpecificPreprocessor.preprocess(lightText, classification?.format || 'amazon.com');

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
   * Create appropriate parser based on format classification
   * @param {Object} classification - Format classification result
   * @returns {BaseParser} - Format-specific parser instance
   */
  static createParserFromClassification(classification) {
    const { format, subtype } = classification;

    // Route based on format and subtype
    if (format === 'amazon.com') {
      console.log('📍 Routing to US Parser');
      return new USParser();
    }

    if (format === 'amazon.eu') {
      if (subtype === 'business') {
        console.log('📍 Routing to EU Business Parser');
        return new EUBusinessParser();
      } else if (subtype === 'consumer') {
        console.log('📍 Routing to EU Consumer Parser');
        return new EUConsumerParser();
      } else {
        // Fallback: try to detect from content or default to consumer
        console.log('⚠️  Unknown EU subtype, defaulting to EU Consumer Parser');
        return new EUConsumerParser();
      }
    }

    // Fallback to language-based routing for unknown formats
    console.warn(`⚠️  Unknown format '${format}', falling back to language detection`);
    return null; // Will trigger fallback logic
  }

  /**
   * LEGACY: Create appropriate parser based on detected language (for backward compatibility)
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
   * @returns {Object} - Map of format specifiers to parser classes
   */
  static getAvailableParsers() {
    return {
      // New format-based parsers
      'amazon.com': USParser,
      'amazon.eu.business': EUBusinessParser,
      'amazon.eu.consumer': EUConsumerParser,
      // Legacy language-based parsers (for fallback)
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
    // Use new pipeline for testing
    const lightText = LightPreprocessor.preprocess(rawText);
    const classification = this.classifyFormat(lightText);
    const preprocessedText = FormatSpecificPreprocessor.preprocess(lightText, classification?.format || 'amazon.com');

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
      // Test new preprocessing pipeline
      const testText = 'Test Ã© text with € symbols';
      const lightText = LightPreprocessor.preprocess(testText);
      const classification = FormatClassifier.classify(testText);
      const processed = FormatSpecificPreprocessor.preprocess(lightText, classification.format);

      results.components.preprocessor = {
        status: 'healthy',
        details: `Pipeline processed "${testText}" to "${processed}" (format: ${classification.format})`
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
        (item.unitPrice || item.totalPrice) && item.description && item.description.trim()
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