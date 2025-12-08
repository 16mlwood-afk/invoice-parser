# Parser Development Guide

This guide explains how to create new language-specific parsers for the Amazon Invoice Parser's three-stage pipeline architecture.

## Prerequisites

Before creating a new parser, ensure you have:
- Understanding of the three-stage pipeline architecture
- Sample invoices from the target language/region
- Knowledge of local currency formats and tax terminology
- Familiarity with JavaScript regex patterns

## Step 1: Analyze Sample Invoices

### Collect Sample Data
Gather 5-10 sample invoices from the target Amazon marketplace to understand:
- **Order number formats** and labels
- **Date formats** used in the region
- **Currency symbols** and number formatting
- **Tax terminology** (VAT, GST, IVA, etc.)
- **Item description patterns**
- **Shipping and total labels**

### Identify Patterns
Document recurring patterns:
```
Order Number: "Bestellnummer: 123-4567890-1234567"
Date: "Bestelldatum: 15. Dezember 2023"
Currency: "€129,99" (comma as decimal separator)
Tax: "MwSt: €25,59"
```

## Step 2: Create Parser Class

### Basic Structure
Create a new file in `src/parsers/` following the naming convention: `{language}-parser.js`

```javascript
/**
 * {Language} Invoice Parser
 *
 * Specialized parser for {Language} ({Country}) Amazon invoices
 * Handles {specific features}
 */

const BaseParser = require('./base-parser');

class {Language}Parser extends BaseParser {
  constructor() {
    super('{Language Name}', '{COUNTRY_CODE}');
  }

  extract(text) {
    const items = this.extractItems(text);
    const subtotal = this.extractSubtotal(text) || this.calculateSubtotalFromItems(items);

    const rawInvoice = {
      orderNumber: this.extractOrderNumber(text),
      orderDate: this.extractOrderDate(text),
      items: items,
      subtotal: subtotal,
      shipping: this.extractShipping(text),
      tax: this.extractTax(text),
      total: this.extractTotal(text),
      vendor: 'Amazon'
    };

    // Validate against schema
    const { error, value } = this.invoiceSchema.validate(rawInvoice, {
      stripUnknown: true,
      convert: true
    });

    if (error) {
      console.warn('{Language} invoice validation warning:', error.details[0].message);
    }

    // Perform data validation
    const validationResult = this.validateInvoiceData(value);
    value.validation = validationResult;

    return value;
  }

  // Implementation of extraction methods...
}
```

## Step 3: Implement Extraction Methods

### Order Number Extraction

```javascript
extractOrderNumber(text) {
  if (!text || typeof text !== 'string') return null;

  // Language-specific order number patterns
  const orderPatterns = [
    /{Local order number label}:?\s*(\d{3}-\d{7}-\d{7})/i,
    /{Alternative patterns}/i,
    // Fallback to standard format
    /(?<![-\d])(\d{3}-\d{7}-\d{7})(?![-\d])/,
  ];

  for (const pattern of orderPatterns) {
    const match = text.match(pattern);
    if (match) {
      const orderNum = match[1];
      // Validate format (3-7-7 digits)
      const segments = orderNum.split('-');
      if (segments.length === 3 &&
          segments[0].length === 3 && /^\d{3}$/.test(segments[0]) &&
          segments[1].length === 7 && /^\d{7}$/.test(segments[1]) &&
          segments[2].length === 7 && /^\d{7}$/.test(segments[2])) {
        return orderNum;
      }
    }
  }
  return null;
}
```

### Date Extraction

```javascript
extractOrderDate(text) {
  if (!text || typeof text !== 'string') return null;

  // Local date patterns
  const datePatterns = [
    /{Local date label}:?\s*{local date format}/i,
    // Include various formats: DD/MM/YYYY, DD.MM.YYYY, Month DD YYYY
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[1];
      if (this.isValidDate(dateStr)) {
        return dateStr;
      }
    }
  }

  // Fallback to generic date extraction
  return this.extractGenericDate(text);
}
```

### Item Extraction

```javascript
extractItems(text) {
  if (!text || typeof text !== 'string') return [];

  const items = [];
  const lines = text.split('\n');

  // Local item patterns
  const itemPatterns = [
    /^(\d+)\s*x\s+(.+?)\s+({currency}\s*\d+[,.]\d{2})/i,
    /^(.+?)\s+({currency}\s*\d+[,.]\d{2})/i,
  ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    for (const pattern of itemPatterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        let description = match[2] || match[1];
        const price = match[3];

        // Clean up description
        description = description.replace(/\s+/g, ' ').trim();

        // Skip total/subtotal lines
        if (this.isTotalLine(description)) continue;

        items.push({
          description: description,
          price: price
        });
        break;
      }
    }
  }

  return items;
}
```

### Amount Extractions (Subtotal, Shipping, Tax, Total)

```javascript
extractSubtotal(text) {
  const subtotalPatterns = [
    /{local subtotal label}:?\s*({currency}\s*\d+[,.]\d{2})/i,
  ];
  // Implementation similar to other parsers
}

extractShipping(text) {
  const shippingPatterns = [
    /{local shipping label}:?\s*({currency}\s*\d+[,.]\d{2})/i,
  ];
  // Implementation
}

extractTax(text) {
  const taxPatterns = [
    /{local tax label}:?\s*({currency}\s*\d+[,.]\d{2})/i,
  ];
  // Implementation
}

extractTotal(text) {
  const totalPatterns = [
    /{local total label}:?\s*({currency}\s*\d+[,.]\d{2})/i,
  ];
  // Implementation
}
```

## Step 4: Handle Currency and Formatting

### Currency-Specific Patterns
Different regions use different decimal separators and currency placements:

```javascript
// European style: 1.234,56 €
const euroPattern = /€\s*\d{1,3}(?:\.\d{3})*,\d{2}/g;

// US style: $1,234.56
const usdPattern = /\$\s*\d{1,3}(?:,\d{3})*\.\d{2}/g;

// Japanese style: ¥1,234
const jpyPattern = /¥\s*\d{1,3}(?:,\d{3})*/g;
```

### Number Parsing
Implement `calculateSubtotalFromItems` with currency-aware parsing:

```javascript
calculateSubtotalFromItems(items) {
  let total = 0;
  for (const item of items) {
    if (item.price) {
      // Handle local number formatting
      const cleanPrice = item.price
        .replace(/{currency}/g, '')
        .replace(/\s+/g, '')
        .replace(/{decimal separator}/g, '.')
        .replace(/{thousands separator}/g, '');
      const price = parseFloat(cleanPrice);
      if (!isNaN(price)) {
        total += price;
      }
    }
  }

  if (total > 0) {
    return `{currency}${total.toLocaleString('{locale}')}`;
  }

  return null;
}
```

## Step 5: Update Language Detection

Add patterns to `src/language-detector.js`:

```javascript
static detect{COUNTRY_CODE}(text) {
  let score = 0;
  const upperText = text.toUpperCase();

  // High confidence indicators
  const highConfidencePatterns = [
    /{CORE_INVOICE_TERMS}/i,
  ];

  // Medium confidence indicators
  const mediumConfidencePatterns = [
    /{SUPPORTING_PHRASES}/i,
  ];

  // Count matches and apply scoring
  for (const pattern of highConfidencePatterns) {
    if (pattern.test(upperText)) {
      score += 0.15;
    }
  }

  for (const pattern of mediumConfidencePatterns) {
    if (pattern.test(upperText)) {
      score += 0.08;
    }
  }

  // Currency patterns
  if (/{currency patterns}/.test(upperText)) {
    score += 0.15;
  }

  // Date patterns
  if (/{local date patterns}/.test(upperText)) {
    score += 0.10;
  }

  return Math.min(score, 1.0);
}
```

Update `SUPPORTED_LANGUAGES`:

```javascript
static get SUPPORTED_LANGUAGES() {
  return {
    // ... existing languages
    '{COUNTRY_CODE}': '{Language Name}',
  };
}
```

## Step 6: Register Parser

Update `src/parser-factory.js`:

```javascript
const {Language}Parser = require('./parsers/{language}-parser');

// In createParser method:
case '{COUNTRY_CODE}':
  return new {Language}Parser();

// In getAvailableParsers:
'{COUNTRY_CODE}': {Language}Parser,
```

## Step 7: Add Tests

Create comprehensive tests in `tests/unit/`:

```javascript
const { ParserFactory } = require('../../index');

describe('ParserFactory - {Language} Support', () => {
  const testInvoice = `
    {sample invoice text}
  `;

  test('should parse {language} invoice correctly', async () => {
    const result = await ParserFactory.parseInvoice(testInvoice);

    expect(result).toBeTruthy();
    expect(result.languageDetection.language).toBe('{COUNTRY_CODE}');
    expect(result.orderNumber).toBeDefined();
    expect(result.performanceMetrics).toBeTruthy();
  });
});
```

## Step 8: Update Documentation

### README Updates
- Add new language to supported languages list
- Update feature descriptions
- Add currency support information

### Sample Output
Update sample output to show new language detection and currency formats.

## Common Patterns by Region

### European Countries
- **Currency**: € (comma decimal separator)
- **Date formats**: DD.MM.YYYY, DD/MM/YYYY
- **VAT terminology**: MWST (DE), TVA (FR), IVA (IT/ES)

### English-Speaking Countries
- **US**: $ (period decimal), MM/DD/YYYY
- **UK**: £ (period decimal), DD/MM/YYYY
- **Australia**: $ (period decimal), DD/MM/YYYY

### Asian Countries
- **Japan**: ¥ (no decimal for whole amounts), YYYY年MM月DD日

## Troubleshooting

### Common Issues
1. **Date parsing fails**: Check for local date format variations
2. **Currency not recognized**: Verify currency symbol placement and formatting
3. **Tax terms missed**: Research local tax terminology
4. **Low confidence scores**: Add more specific patterns to language detector

### Debugging Tips
- Use `ParserFactory.testAllParsers(text)` to compare parser results
- Check language detection confidence scores
- Enable debug mode: `ParserFactory.parseInvoice(text, { debug: true })`
- Validate against sample invoices from the target region

## Performance Considerations

- **Pattern efficiency**: Use specific patterns before generic ones
- **Memory usage**: Parsers are lightweight and reusable
- **Fallback handling**: Ensure graceful degradation for edge cases
- **Testing coverage**: Test with various invoice formats and edge cases

## Contributing

When contributing a new parser:
1. Follow the established code style and patterns
2. Include comprehensive tests with multiple sample invoices
3. Update documentation and README
4. Test integration with the full pipeline
5. Consider performance implications

## Support

For questions about parser development:
- Review existing parsers for patterns
- Check language detector implementation
- Test with sample data from target region
- Ensure compliance with local formatting standards