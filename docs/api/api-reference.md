# API Reference

Complete API documentation for the Amazon Invoice Parser library.

## Table of Contents

- [ParserFactory](#parserfactory)
- [LanguageDetector](#languagedetector)
- [BaseParser](#baseparser)
- [Language-Specific Parsers](#language-specific-parsers)
- [CLI Interface](#cli-interface)

## ParserFactory

The main entry point for the three-stage pipeline processing.

### Methods

#### `parseInvoice(rawText, options)`

Parses invoice text using the complete three-stage pipeline.

**Parameters:**
- `rawText` (string): Raw PDF text content
- `options` (object, optional):
  - `debug` (boolean): Enable debug logging (default: false)

**Returns:** Promise resolving to parsed invoice object or null

**Example:**
```javascript
const result = await ParserFactory.parseInvoice(pdfText, { debug: true });
```

#### `getAvailableParsers()`

Returns map of available language codes to parser classes.

**Returns:** Object mapping language codes to parser constructors

**Example:**
```javascript
const parsers = ParserFactory.getAvailableParsers();
// { 'EN': EnglishParser, 'DE': GermanParser, ... }
```

#### `testAllParsers(rawText)`

Tests parsing with all available parsers for debugging.

**Parameters:**
- `rawText` (string): Raw PDF text content

**Returns:** Promise resolving to object with results from each parser

#### `generatePerformanceReport(invoices)`

Generates comprehensive performance report for multiple invoices.

**Parameters:**
- `invoices` (array): Array of parsed invoice results

**Returns:** Object containing performance statistics and metrics

#### `calculateExtractionMetrics(invoice)`

Calculates extraction success metrics for a single invoice.

**Parameters:**
- `invoice` (object): Parsed invoice data

**Returns:** Object with overall success rate and field-level metrics

## LanguageDetector

Handles automatic language identification and confidence scoring.

### Static Methods

#### `detect(text)`

Detects the language of invoice text.

**Parameters:**
- `text` (string): Preprocessed invoice text

**Returns:** Object with language code, confidence score, and evidence

**Example:**
```javascript
const detection = LanguageDetector.detect(text);
// { language: 'EN', confidence: 0.95, evidence: 'Detected English patterns' }
```

#### `detect{XX}(text)`

Language-specific detection methods for each supported language.

**Parameters:**
- `text` (string): Preprocessed text

**Returns:** Number between 0-1 representing confidence score

### Constants

#### `SUPPORTED_LANGUAGES`

Object mapping language codes to language names.

```javascript
{
  'EN': 'English',
  'DE': 'German',
  'FR': 'French',
  'ES': 'Spanish',
  'IT': 'Italian',
  'JP': 'Japanese',
  'CA': 'Canadian French',
  'AU': 'Australian English',
  'CH': 'Swiss German',
  'GB': 'British English'
}
```

## BaseParser

Abstract base class providing common functionality for all language parsers.

### Constructor

#### `new BaseParser(language, country)`

**Parameters:**
- `language` (string): Full language name
- `country` (string): ISO country code

### Properties

#### `language`

The language name (e.g., 'English', 'German')

#### `country`

The country code (e.g., 'EN', 'DE')

#### `invoiceSchema`

Joi validation schema for invoice data structure

### Methods

#### `extract(text)`

Abstract method - must be implemented by subclasses.

**Parameters:**
- `text` (string): Preprocessed invoice text

**Returns:** Validated invoice object

#### `extractGenericDate(text)`

Fallback date extraction using generic patterns.

**Parameters:**
- `text` (string): Text to search for dates

**Returns:** First valid date found or null

#### `isValidDate(dateStr)`

Validates date string format.

**Parameters:**
- `dateStr` (string): Date string to validate

**Returns:** Boolean indicating validity

#### `validateInvoiceData(invoice)`

Performs business logic validation with scoring.

**Parameters:**
- `invoice` (object): Invoice data to validate

**Returns:** Validation result with score and error details

#### `calculateSubtotalFromItems(items)`

Calculates subtotal from item prices.

**Parameters:**
- `items` (array): Array of item objects with price properties

**Returns:** Formatted subtotal string or null

## Language-Specific Parsers

All language parsers extend BaseParser and implement the same interface.

### Common Interface

Each parser implements these methods:

#### `extractOrderNumber(text)`
#### `extractOrderDate(text)`
#### `extractItems(text)`
#### `extractSubtotal(text)`
#### `extractShipping(text)`
#### `extractTax(text)`
#### `extractTotal(text)`

**Parameters:** `text` (string) - Preprocessed invoice text

**Returns:** Extracted data or null

### Available Parsers

- `EnglishParser` - English (EN)
- `GermanParser` - German (DE)
- `FrenchParser` - French (FR)
- `SpanishParser` - Spanish (ES)
- `ItalianParser` - Italian (IT)
- `JapaneseParser` - Japanese (JP)
- `CanadianFrenchParser` - Canadian French (CA)
- `AustralianParser` - Australian English (AU)
- `SwissParser` - Swiss German (CH)
- `UKParser` - British English (GB)

## CLI Interface

Command-line interface for batch processing and single file parsing.

### Commands

#### `parse <file>`

Parse a single invoice file.

**Options:**
- `-o, --output <file>`: Output file path
- `-d, --output-dir <directory>`: Output directory
- `-f, --format <format>`: Output format (json, csv, text)
- `-v, --verbose`: Show detailed performance metrics
- `--overwrite`: Overwrite existing files
- `--backup`: Create backup of existing files

**Example:**
```bash
amazon-invoice-parser parse invoice.pdf --verbose --output result.json
```

#### `batch <directory>`

Process multiple invoice files in a directory.

**Options:**
- `-o, --output <file>`: Output file for batch results
- `-f, --format <format>`: Output format
- `-r, --recursive`: Process subdirectories
- `--pattern <glob>`: File pattern to match

**Example:**
```bash
amazon-invoice-parser batch ./invoices/ --output batch-results.json
```

#### `report <input>`

Generate spending reports from parsed invoice data.

**Options:**
- `--monthly`: Generate monthly spending breakdown
- `--categories`: Include category analysis
- `--currency <code>`: Target currency for reports

## Data Structures

### Invoice Object

```javascript
{
  // Core invoice data
  orderNumber: "123-4567890-1234567",
  orderDate: "December 15, 2023",
  items: [
    {
      description: "1 x Echo Dot (5th Gen)",
      price: "$49.99"
    }
  ],
  subtotal: "$89.98",
  shipping: "$0.00",
  tax: "$7.19",
  total: "$97.17",
  vendor: "Amazon",

  // Metadata
  languageDetection: {
    language: "EN",
    confidence: 0.95,
    evidence: "Detected English patterns"
  },

  processingMetadata: {
    pipeline: "three-stage",
    languageDetection: "EN",
    parser: "EnglishParser",
    timestamp: "2023-12-15T10:30:00.000Z"
  },

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
  },

  // Optional fields
  pdfMetadata: {
    fileSize: 245760,
    extractedAt: "2023-12-15T10:30:00.000Z",
    extractionMethod: "pdf-parse-library",
    pages: 1,
    textLength: 1234
  },

  validation: {
    score: 95,
    isValid: true,
    warnings: [],
    errors: []
  }
}
```

### Performance Report

```javascript
{
  summary: {
    totalInvoices: 10,
    successfulInvoices: 9,
    failedInvoices: 1,
    successRate: 0.9
  },
  performance: {
    averageProcessingTime: 42,
    minProcessingTime: 35,
    maxProcessingTime: 67,
    totalProcessingTime: 420
  },
  extraction: {
    averageExtractionSuccess: 0.95,
    fieldSuccessRates: {
      orderNumber: 1.0,
      orderDate: 0.9,
      items: 1.0,
      subtotal: 0.95,
      tax: 0.85,
      shipping: 0.9,
      total: 1.0
    }
  },
  languages: {
    EN: {
      count: 7,
      averageConfidence: 0.92
    },
    DE: {
      count: 2,
      averageConfidence: 0.88
    }
  },
  errors: [
    "PDF parsing failed: corrupted file"
  ]
}
```

## Error Handling

### Parser Errors

- **Language Detection Failure**: Returns unknown language with low confidence
- **Parser Failure**: Falls back to base parser for partial extraction
- **Validation Errors**: Invoice data marked as invalid with error details
- **File Errors**: Graceful handling of missing or corrupted files

### Error Response Format

```javascript
{
  error: "PDF parsing failed",
  partialData: {
    // Any successfully extracted fields
  },
  errorRecovery: {
    originalError: {
      level: "recoverable",
      type: "pdf_parse_error",
      message: "PDF parsing failed: corrupted file",
      context: "file_processing"
    },
    recoverySuggestions: [
      {
        action: "retry_with_different_parser",
        description: "Try alternative PDF parsing library",
        priority: "medium"
      }
    ]
  }
}
```

## Configuration

### Environment Variables

- `NODE_ENV`: Set to 'development' for additional fallback behavior
- `DEBUG`: Enable debug logging (equivalent to `{ debug: true }`)

### Parser Configuration

Parsers can be configured through the ParserFactory options:

```javascript
const options = {
  debug: true,           // Enable debug logging
  timeout: 30000,        // Processing timeout in ms
  fallback: true         // Enable fallback parsing
};
```

## TypeScript Support

While the library is written in JavaScript, TypeScript definitions are available:

```typescript
interface InvoiceData {
  orderNumber?: string;
  orderDate?: string;
  items: Item[];
  subtotal?: string;
  shipping?: string;
  tax?: string;
  total?: string;
  vendor: string;
  // ... additional metadata fields
}

interface Item {
  description: string;
  price?: string;
}

interface LanguageDetection {
  language: string;
  confidence: number;
  evidence: string;
}
```

## Migration Guide

### From Legacy API

If migrating from older versions:

```javascript
// Old API
const parser = new AmazonInvoiceParser();
const result = parser.extractInvoiceData(text);

// New API
const result = await ParserFactory.parseInvoice(text);
```

### Breaking Changes

- All parsing methods now return Promises
- Language detection results include confidence scores
- Performance metrics are automatically collected
- Schema validation is more strict

## Examples

See the `examples/` directory for complete usage examples:

- `basic-usage.js` - Simple single invoice parsing
- `batch-processing.js` - Processing multiple invoices
- `cli-usage.js` - Command-line interface examples