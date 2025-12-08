# Backend Architecture

## Technology Stack

**Runtime:** Node.js 18+ (LTS)
**Language:** JavaScript/TypeScript with ES modules
**Package Management:** npm workspaces for monorepo management

**Core Dependencies:**
- PDF parsing: `pdf-parse@1.1.1` (primary) with `pdf2pic` + OCR fallback
- Data validation: `joi` for schema validation
- CLI framework: `commander` for command-line interface
- Logging: `winston` for structured logging
- Testing: `jest` + `supertest` for unit and integration tests

## Service Architecture

**Pattern:** Modular monolith with clear service boundaries

**Core Services:**
1. **PDF Processing Service** - Handles PDF text extraction and initial parsing
2. **Data Extraction Service** - Applies business logic for invoice data identification
3. **Validation Service** - Ensures data consistency and quality
4. **Output Service** - Formats and exports data in requested formats
5. **Reporting Service** - Generates analytics and spending reports

**Communication:** Direct function calls with dependency injection. Services are organized as modules within the core package for easy testing and reuse.

## API Design

**Primary Interface:** File-based I/O with programmatic API

**Core API:**
```javascript
const parser = new AmazonInvoiceParser();

await parser.parseInvoice(filePath);           // Single file
await parser.parseMultipleInvoices(filePaths); // Batch processing
await parser.generateReport(invoices);         // Analytics
```

**Future Web API:** RESTful endpoints for web interface integration
- `POST /api/parse` - Single invoice processing
- `POST /api/batch` - Multiple invoice processing
- `GET /api/reports/:id` - Retrieve generated reports

## Security Architecture

**Data Privacy:** All processing occurs locally, no external data transmission
**Input Validation:** Comprehensive file type and content validation
**Error Handling:** Secure error messages without exposing system details
**Dependency Security:** Regular security audits and dependency updates
