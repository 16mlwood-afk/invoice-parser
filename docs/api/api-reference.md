# API Reference

Complete API documentation for the Amazon Invoice Parser library.

## Table of Contents

- [ParserFactory](#parserfactory)
- [LanguageDetector](#languagedetector)
- [BaseParser](#baseparser)
- [Language-Specific Parsers](#language-specific-parsers)
- [CLI Interface](#cli-interface)
- [Web API](#web-api)

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

## Regional Price and VAT Handling

Different Amazon marketplaces have varying VAT/tax structures that affect how prices are displayed and extracted.

### EU Consumer Invoices (amazon.eu consumer)

**Price Structure:** EU consumer invoices display prices with VAT already included (VAT-inclusive).

**Format:**
```
Beschreibung | Menge | Stückpreis (ohne USt.) | USt. % | Stückpreis (inkl. USt.) | Zwischensumme (inkl. USt.)
Product Name | 1     | 149,99 €               | 20%    | 59,99 €                 | 59,99 €
```

**Extraction Logic:**
- Extracts **VAT-inclusive prices** (`Stückpreis (inkl. USt.)`)
- `unitPrice`: €59.99 (VAT-inclusive)
- `totalPrice`: €59.99 (VAT-inclusive)
- Currency: EUR

**Validation:** Item totals are validated against invoice subtotal with €1 tolerance.

### EU Business Invoices (amazon.eu business)

**Price Structure:** EU business invoices display ex-VAT prices (net amounts).

**Format:**
```
Description | Qty | Unit Price | Tax % | Unit Price | Total
Product     | 1   | 149.99 €  | 20%  | 179.99 €  | 179.99 €
```

**Extraction Logic:**
- Extracts **ex-VAT prices** (appropriate for business invoices)
- `unitPrice`: €149.99 (ex-VAT)
- `totalPrice`: €179.99 (inc-VAT)
- Currency: EUR

### UK Invoices (amazon.co.uk)

**Price Structure:** UK invoices display VAT-inclusive prices.

**Format:**
```
1 x Product Name £129.99
```

**Extraction Logic:**
- Extracts single price value (VAT-inclusive)
- `price`: £129.99 (VAT-inclusive)
- Currency: GBP

### Swiss Invoices (amazon.ch)

**Price Structure:** Swiss invoices display VAT-inclusive prices.

**Format:**
```
Product Name CHF 129.99
```

**Extraction Logic:**
- Extracts single price value (VAT-inclusive)
- `price`: CHF 129.99 (VAT-inclusive)
- Currency: CHF

### Price Validation

All parsers include comprehensive validation:

- **Item-to-Subtotal Validation:** Ensures sum of item prices matches invoice subtotal
- **Tolerance:** €1.00 for rounding differences
- **Severity Levels:**
  - Critical: Discrepancies >10% of subtotal
  - High: Discrepancies >€1.00
  - Warning: Minor discrepancies €0.10-€1.00

**Example Validation:**
```javascript
// Valid invoice (within tolerance)
{
  items: [{ unitPrice: 59.99, quantity: 1 }],
  subtotal: "59.99 €",
  validation: {
    score: 95,
    isValid: true,
    errors: [],
    warnings: []
  }
}

// Invalid invoice (critical error)
{
  items: [{ unitPrice: 149.99, quantity: 1 }], // Wrong column!
  subtotal: "59.99 €",
  validation: {
    score: 65,
    isValid: false,
    errors: [{
      type: "item_subtotal_mismatch",
      severity: "critical",
      message: "Item totals (€149.99) don't match invoice subtotal (€59.99). Difference: €90.00"
    }]
  }
}
```

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

## Web API Reference

The Amazon Invoice Parser provides a RESTful API for web applications, enabling programmatic access to all parsing functionality.

### Base URL
```
http://localhost:3001/api
```

### Authentication
Currently, no authentication is required. All endpoints are publicly accessible.

### Common Response Format
All API responses follow this structure:
```json
{
  "success": boolean,
  "data"?: any,
  "error"?: string,
  "message"?: string
}
```

### Endpoints

#### GET /api/health
Health check endpoint for monitoring API availability.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-08T13:41:37.108Z",
  "version": "1.0.0"
}
```

#### POST /api/upload
Upload PDF files for processing. Supports single files or batch uploads.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `files` (array of PDF files, max 50 files, 50MB each)

**Response (Success):**
```json
{
  "success": true,
  "jobId": "job_1765201297135_ggy4scjur",
  "message": "2 file(s) uploaded successfully",
  "files": [
    {
      "filename": "invoice1.pdf",
      "size": 245760,
      "mimeType": "application/pdf"
    }
  ]
}
```

**Response (Error - No files):**
```json
{
  "error": "No files uploaded",
  "message": "At least one PDF file must be provided"
}
```

**Response (Error - Invalid file type):**
```json
{
  "error": "Invalid file type",
  "message": "Only PDF files are allowed for upload"
}
```

#### POST /api/process/:jobId
Start processing uploaded files for a specific job.

**Parameters:**
- `jobId`: Job identifier returned from upload endpoint

**Response (Success):**
```json
{
  "success": true,
  "jobId": "job_1765201297135_ggy4scjur",
  "message": "Processing started",
  "status": "processing",
  "note": "Use /api/status/:jobId to check progress"
}
```

**Response (Error - Invalid job):**
```json
{
  "error": "Invalid job ID",
  "message": "Job ID must be provided and start with \"job_\""
}
```

#### GET /api/status/:jobId
Check the processing status of a job.

**Parameters:**
- `jobId`: Job identifier

**Response (Success):**
```json
{
  "success": true,
  "job": {
    "id": "job_1765201297135_ggy4scjur",
    "status": "completed",
    "progress": {
      "total": 2,
      "processed": 2,
      "successful": 2,
      "failed": 0
    },
    "files": [
      {
        "filename": "invoice1.pdf",
        "size": 245760,
        "uploadedAt": "2025-12-08T13:41:37.121Z"
      }
    ],
    "created": "2025-12-08T13:41:37.108Z",
    "completed": "2025-12-08T13:41:37.282Z",
    "results": [...],
    "errors": []
  }
}
```

#### GET /api/results/:jobId
Retrieve processed results for a completed job.

**Parameters:**
- `jobId`: Job identifier

**Response (Success):**
```json
{
  "success": true,
  "jobId": "job_1765201297135_ggy4scjur",
  "results": [
    {
      "filename": "invoice1.pdf",
      "success": true,
      "data": {
        "orderNumber": "123-4567890-1234567",
        "orderDate": "2023-12-01",
        "items": [...],
        "subtotal": 99.99,
        "tax": 8.00,
        "total": 107.99
      },
      "processedAt": "2025-12-08T13:41:37.282Z"
    }
  ]
}
```

**Response (Error - Job not completed):**
```json
{
  "error": "Job not completed",
  "message": "The job is still processing. Use /api/status/:jobId to check progress."
}
```

#### GET /api/export/:jobId?format=json|csv|pdf
Download processed results in the specified format.

**Parameters:**
- `jobId`: Job identifier
- `format`: Export format (json, csv, or pdf)

**Response:**
- Downloads file with appropriate content-type and filename
- JSON: `application/json` with filename `invoice-results-{jobId}.json`
- CSV: `text/csv` with filename `invoice-results-{jobId}.csv`
- PDF: `application/pdf` with filename `invoice-results-{jobId}.pdf`

**Response (Error):**
```json
{
  "error": "Export failed",
  "message": "Job not found or export format not supported"
}
```

**Example:**
```javascript
// Download as JSON
const response = await fetch('/api/export/job_123?format=json');
if (response.ok) {
  const blob = await response.blob();
  // Handle file download
}

// Download as CSV
window.open('/api/export/job_123?format=csv', '_blank');
```

#### DELETE /api/cleanup/:jobId
Clean up temporary files and job data.

**Parameters:**
- `jobId`: Job identifier

**Response (Success):**
```json
{
  "success": true,
  "jobId": "job_1765201297135_ggy4scjur",
  "message": "Job cleaned up successfully"
}
```

### Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | No files uploaded | No PDF files provided in upload request |
| 400 | Invalid file type | Non-PDF file uploaded |
| 400 | Invalid job ID | Job ID format is incorrect |
| 400 | Invalid format | Export format not supported |
| 400 | Invalid template | PDF template not supported |
| 404 | Job not found | Specified job does not exist |
| 404 | No results found | Job completed but no results available |
| 409 | Job not completed | Attempting to get results for incomplete job |
| 413 | Limit exceeded | Export exceeds size/quantity limits |
| 500 | Internal server error | Unexpected server error |
| 500 | Export failed | Error during export generation |

### Rate Limiting
Currently, no rate limiting is implemented. Consider adding rate limiting for production deployment.

### File Limits
- Maximum 50 files per upload request
- Maximum 50MB per individual file
- Maximum 500MB total per batch upload

### Export Limits
- Maximum 500 invoices per PDF export
- Maximum 5000 records per export (any format)
- Warning shown when approaching 80% of limits (4000 records)

### Data Compatibility
All API responses maintain compatibility with existing CLI JSON output formats, ensuring seamless integration with existing workflows.

## Web API

The web API provides HTTP endpoints for uploading, processing, and managing invoice parsing jobs.

### Export API

#### GET /api/export/:jobId

Exports job processing results in JSON, CSV, or PDF format.

**Parameters:**
- `jobId` (string, required): Job ID (must start with "job_")
- `format` (string, optional): Export format - "json", "csv", or "pdf" (default: "json")
- `template` (string, optional): PDF template - "summary", "detailed", or "financial" (default: "detailed", PDF only)

**Response Headers:**
- `Content-Type`: "application/json", "text/csv", or "application/pdf"
- `Content-Disposition`: "attachment; filename=invoice-results-{jobId}-{timestamp}.{ext}"
- `x-export-limit-warning` (optional): Warning when approaching export limits

**Success Response (JSON example):**
```json
{
  "jobId": "job_1234567890_abc123",
  "exportDate": "2025-12-08T18:29:01.424Z",
  "summary": {
    "totalFiles": 1,
    "processedFiles": 1,
    "failedFiles": 0,
    "successRate": 100
  },
  "results": [
    {
      "filename": "invoice.pdf",
      "orderNumber": "123-4567890-1234567",
      "orderDate": "2024-01-15",
      "customerInfo": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "items": [
        {
          "description": "Product Name",
          "quantity": 1,
          "unitPrice": 29.99,
          "total": 29.99
        }
      ],
      "totals": {
        "subtotal": 29.99,
        "shipping": 0,
        "tax": 2.4,
        "total": 32.39
      },
      "currency": "USD",
      "validationStatus": "valid",
      "validationErrors": []
    }
  ],
  "errors": []
}
```

**Error Responses:**
- `400 Invalid job ID`: Job ID format incorrect
- `400 Invalid format`: Format not supported
- `400 Invalid template`: PDF template not supported
- `404 Job not found`: Job does not exist
- `404 No results found`: Job completed but no results available
- `409 Job not completed`: Job still processing
- `413 Limit exceeded`: Export exceeds size limits (details provided)
- `500 Export failed`: Unexpected error during export

## Examples

See the `examples/` directory for complete usage examples:

- `basic-usage.js` - Simple single invoice parsing
- `batch-processing.js` - Processing multiple invoices
- `cli-usage.js` - Command-line interface examples

### API Usage Example
```javascript
// Upload files
const formData = new FormData();
formData.append('files', pdfFile1);
formData.append('files', pdfFile2);

const uploadResponse = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});
const { jobId } = await uploadResponse.json();

// Start processing
await fetch(`/api/process/${jobId}`, { method: 'POST' });

// Check status
const statusResponse = await fetch(`/api/status/${jobId}`);
const { job } = await statusResponse.json();

// Get results when complete
if (job.status === 'completed') {
  const resultsResponse = await fetch(`/api/results/${jobId}`);
  const { results } = await resultsResponse.json();

  // Export results
  const exportResponse = await fetch(`/api/export/${jobId}?format=json`);
  const exportData = await exportResponse.json();
}
```