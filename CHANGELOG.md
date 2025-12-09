# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-09

### Fixed
- **CRITICAL: EU Consumer Parser Price Column Bug** - Fixed incorrect price extraction in EU consumer invoices
  - **Issue**: Parser was extracting ex-VAT prices (`Stückpreis (ohne USt.)`) instead of VAT-inclusive prices (`Stückpreis (inkl. USt.)`)
  - **Impact**: Inflated item prices by ~2.5x, incorrect financial reporting for European customers
  - **Root Cause**: Regex pattern matched first euro amount instead of VAT-inclusive column
  - **Fix**: Updated extraction logic to handle multi-line table format and correctly select VAT-inclusive prices
  - **Validation**: Added item-to-subtotal cross-validation with €1 tolerance to prevent similar issues

### Added
- **Item-to-Subtotal Validation** - New validation ensures item prices match invoice subtotals
  - Critical errors for discrepancies >10% of subtotal
  - High severity for discrepancies >€1.00
  - Warning for minor discrepancies €0.10-€1.00
  - Prevents pricing accuracy issues across all parsers

- **Enhanced EU Consumer Parser**
  - Improved multi-line table format handling
  - Better extraction of VAT-inclusive unit prices and totals
  - Comprehensive logging for debugging price extraction

### Documentation
- **API Documentation Updates** - Added comprehensive VAT handling guide
  - Documented price extraction logic for all regional parsers
  - Explained VAT-inclusive vs ex-VAT price handling
  - Added validation rules and severity levels
  - Included examples of correct vs incorrect price extraction

### Testing
- **Integration Testing** - Verified fix works with actual EU consumer invoices
- **Regression Testing** - All 155 unit tests pass
- **Parser Audit** - Verified other EU parsers (Business, UK, Swiss) handle prices correctly

### Technical Details
- **Parser**: EU Consumer Parser now correctly extracts from multi-line table format
- **Validation**: New `validateItemToSubtotalConsistency()` method in validation.js
- **Tolerance**: €1.00 tolerance for rounding differences in price validation
- **Performance**: No performance impact on existing functionality

### Migration Notes
- EU consumer invoices will now show correct VAT-inclusive prices
- Item-to-subtotal validation may flag previously undetected pricing errors
- No breaking changes to API interface

## [1.0.0] - 2025-01-01

### Added
- Initial release of Amazon Invoice Parser
- Support for multiple Amazon marketplaces (US, EU, UK, CA, AU, JP, CH)
- Three-stage parsing pipeline (Preprocessing → Language Detection → Extraction)
- CLI interface for batch processing
- Web API for real-time processing
- Comprehensive validation and error handling
- PDF text extraction and processing
- Multi-language support (EN, DE, FR, ES, IT, JP)
- Currency normalization and formatting
- Performance monitoring and metrics
- Export functionality (JSON, CSV, PDF reports)

### Technical Features
- Parser factory pattern for extensible architecture
- Schema validation with Joi
- Comprehensive test coverage
- Error recovery and partial data extraction
- Confidence scoring for parsing accuracy