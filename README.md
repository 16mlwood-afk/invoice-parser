# Amazon Invoice Parser

A Node.js utility to extract structured data from Amazon invoice PDFs. Companion tool for the Amazon Invoice Extractor Chrome extension.

## Features

- **Structured Data Extraction** - Parses order numbers, dates, items, and amounts from Amazon invoices
- **Multi-Currency Support** - Handles USD ($), EUR (€), GBP (£)
- **Multi-Language Support** - English, German, French, and more
- **Batch Processing** - Process multiple invoices at once
- **JSON Export** - Structured output for integration with other tools
- **Spending Reports** - Generate summaries and analytics

## Installation

```bash
npm install
```

## Usage

### Basic Testing

```bash
# Run unit tests with mock data
npm test

# Test with actual PDF files
npm run test-pdfs
```

### Programmatic Usage

```javascript
const AmazonInvoiceParser = require('./index');

const parser = new AmazonInvoiceParser();

// Parse a single invoice
const invoice = await parser.parseInvoice('./invoices/amazon-invoice.pdf');
console.log(invoice);
```

### Batch Processing

```javascript
const parser = new AmazonInvoiceParser();

// Parse multiple invoices
const invoices = await parser.parseMultipleInvoices([
  './downloads/invoice1.pdf',
  './downloads/invoice2.pdf'
]);

// Generate spending report
const report = parser.generateReport(invoices);
console.log(JSON.stringify(report, null, 2));
```

## Sample Output

```json
{
  "orderNumber": "123-4567890-1234567",
  "orderDate": "December 15, 2023",
  "items": [
    {
      "description": "1 x Echo Dot (5th Gen)",
      "price": "$49.99"
    }
  ],
  "subtotal": "$89.98",
  "tax": "$7.19",
  "total": "$97.17",
  "vendor": "Amazon"
}
```

## Data Fields Extracted

- **orderNumber**: Amazon order ID (e.g., "123-4567890-1234567")
- **orderDate**: Order placement date
- **items**: Array of purchased items with descriptions and prices
- **subtotal**: Pre-tax amount
- **shipping**: Shipping cost
- **tax**: Tax/VAT amount
- **total**: Grand total
- **vendor**: Always "Amazon"

## Integration with Amazon Invoice Extractor

This parser works seamlessly with the [Amazon Invoice Extractor](https://github.com/your-repo/amazon-invoice-extractor) Chrome extension:

1. Use the extension to download Amazon invoices to a folder
2. Point this parser at that folder
3. Extract structured data for tax preparation or expense tracking

## Current Status

- ✅ **Data Extraction Logic**: Working (tested with mock data)
- ✅ **Multi-Language Parsing**: English & German supported
- ✅ **Batch Processing**: Multiple files at once
- ✅ **Report Generation**: JSON summaries
- ⚠️ **PDF Reading**: Mock implementation (PDF parsing library needs fixing)

## File Structure

```
/Users/masonwood/invoice-parser/
├── index.js              # Main parser class
├── test.js              # Unit tests with mock data
├── test-real-pdfs.js    # Batch processing test
├── all_regions_test_data/  # Sample invoice PDFs
├── invoice-report.json  # Generated analysis (after running tests)
└── README.md           # This file
```

## Dependencies

- **pdf-parse**: PDF text extraction (currently having compatibility issues)
- **Node.js**: File system operations

## Limitations

- PDF parsing library needs to be fixed for production use
- Currently uses mock data for demonstration
- Requires Node.js environment

## Future Enhancements

- Fix PDF parsing library integration
- Web interface for drag-and-drop PDF uploads
- Export to CSV/Excel formats
- Database integration
- Multi-vendor support beyond Amazon
