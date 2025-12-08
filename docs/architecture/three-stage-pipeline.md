# Three-Stage Pipeline Architecture

The Amazon Invoice Parser uses a sophisticated three-stage pipeline architecture designed for maximum accuracy, extensibility, and performance across multiple languages and regions.

## Pipeline Overview

```
Raw PDF Text → [Stage 1] Preprocessor → [Stage 2] Language Detector → [Stage 3] Language-Specific Parser → Structured Invoice Data
```

## Stage 1: Preprocessing

### Purpose
Clean and normalize raw PDF text before analysis to ensure consistent processing across different PDF sources and encodings.

### Components
- **Text Encoding Normalization**: Fixes character encoding issues common in PDF extraction
- **Special Character Handling**: Properly handles currency symbols (€, ¥, £, etc.) and accented characters
- **Line Break Standardization**: Normalizes different line ending styles
- **Whitespace Cleanup**: Removes excessive whitespace while preserving structure

### Implementation
Located in `src/preprocessor.js`, the preprocessor uses regex-based transformations and character encoding detection.

### Key Features
- **Non-destructive**: Preserves all original text while improving consistency
- **Fast**: Minimal performance impact (< 5ms for typical invoice text)
- **Extensible**: Easy to add new preprocessing rules for additional languages

## Stage 2: Language Detection

### Purpose
Automatically identify the language and regional variant of the invoice to route it to the appropriate parser.

### Components
- **Pattern Matching Engine**: Uses language-specific keywords and patterns
- **Confidence Scoring**: Assigns confidence scores (0-1) for each language match
- **Fallback Logic**: Defaults to English when confidence is low

### Supported Languages
- **EN**: English (US/UK/Australia)
- **DE**: German (Germany/Switzerland)
- **FR**: French (France/Canada)
- **ES**: Spanish (Spain)
- **IT**: Italian (Italy)
- **JP**: Japanese (Japan)
- **CA**: Canadian French
- **AU**: Australian English
- **CH**: Swiss German
- **GB**: British English

### Implementation
Located in `src/language-detector.js`, uses weighted pattern matching with language-specific scoring algorithms.

### Detection Logic
Each language has specific patterns with different weights:
- **High confidence** (15 points): Core invoice terminology
- **Medium confidence** (8 points): Supporting phrases
- **Currency patterns** (15 points): Currency symbols and formats
- **Date patterns** (10 points): Localized date formats

## Stage 3: Language-Specific Parsing

### Purpose
Extract structured data using language and region-specific patterns, terminology, and formatting rules.

### Architecture
- **Base Parser**: Common functionality shared across all parsers
- **Language Parsers**: Specialized implementations for each supported language
- **Schema Validation**: Joi-based validation of extracted data
- **Error Recovery**: Fallback mechanisms for partial data extraction

### Parser Components

#### Base Parser (`src/parsers/base-parser.js`)
Provides:
- Schema validation
- Data validation with scoring
- Common utility methods
- Error handling framework

#### Language-Specific Parsers
Each parser implements:
- **Order number extraction** with localized patterns
- **Date parsing** with region-specific formats
- **Item extraction** with currency-aware pricing
- **Amount parsing** (subtotal, shipping, tax, total)
- **Tax terminology** recognition

### Parser Interface
```javascript
class LanguageParser extends BaseParser {
  constructor() {
    super('Language Name', 'COUNTRY_CODE');
  }

  extract(text) {
    // Main extraction logic
    return validatedInvoiceData;
  }

  extractOrderNumber(text) { /* Implementation */ }
  extractOrderDate(text) { /* Implementation */ }
  extractItems(text) { /* Implementation */ }
  extractSubtotal(text) { /* Implementation */ }
  extractShipping(text) { /* Implementation */ }
  extractTax(text) { /* Implementation */ }
  extractTotal(text) { /* Implementation */ }
}
```

## Performance Metrics & Monitoring

### Automatic Metrics Collection
- **Processing Time**: Total time for each stage
- **Confidence Scores**: Language detection confidence
- **Extraction Success**: Field-level success rates
- **Error Tracking**: Failed extractions and recovery attempts

### Metrics Structure
```javascript
{
  performanceMetrics: {
    totalProcessingTime: 45,
    preprocessingTime: 5,
    languageDetectionTime: 5,
    parsingTime: 35,
    extractionSuccess: {
      overall: 1.0,
      fields: {
        orderNumber: true,
        orderDate: true,
        items: true,
        subtotal: true,
        shipping: true,
        tax: true,
        total: true
      }
    },
    languageConfidence: 0.95
  }
}
```

## Error Recovery & Fallbacks

### Multi-Level Error Handling
1. **Parser-level**: Individual field extraction failures
2. **Pipeline-level**: Complete parser failure with fallback to base parser
3. **System-level**: Return partial data when possible

### Recovery Strategies
- **Partial Extraction**: Extract available fields when some fail
- **Fallback Parsing**: Use base parser for unknown languages
- **Mock Data**: Development fallback for testing

## Extensibility

### Adding New Languages
1. Create new parser class extending BaseParser
2. Implement required extraction methods
3. Add language patterns to LanguageDetector
4. Register parser in ParserFactory
5. Add tests and documentation

### Adding New Regions
1. Create region-specific parser (e.g., Canadian French vs European French)
2. Add region-specific patterns and terminology
3. Update language detection patterns
4. Add currency support if needed

## Performance Characteristics

### Typical Performance
- **Preprocessing**: < 5ms
- **Language Detection**: < 10ms
- **Parsing**: 20-50ms per invoice
- **Total**: 35-65ms per invoice

### Scalability
- **Memory**: Minimal memory footprint (~50KB per parser instance)
- **Concurrency**: Thread-safe, supports parallel processing
- **Batch Processing**: Efficient handling of multiple invoices

## Quality Assurance

### Validation Layers
1. **Schema Validation**: Joi-based structure validation
2. **Data Validation**: Business logic validation with scoring
3. **Format Validation**: Currency, date, and number format checking

### Testing Strategy
- **Unit Tests**: Individual parser methods
- **Integration Tests**: Full pipeline testing
- **Cross-Language Tests**: Validation across all supported languages
- **Performance Tests**: Benchmarking and regression testing