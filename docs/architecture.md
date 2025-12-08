# Amazon Invoice Parser Fullstack Architecture Document

## Introduction

This document outlines the complete fullstack architecture for Amazon Invoice Parser, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

### Starter Template or Existing Project
N/A - Greenfield project based on existing Node.js command-line utility. The current implementation provides a foundation for expansion into a fullstack application with both CLI and web interfaces.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-12-07 | v1.1 | Updated PDF parsing to pdf-parse@1.1.1 and added test data documentation | Dev Agent |
| 2025-12-07 | v1.0 | Initial fullstack architecture based on PRD and front-end specification | Winston (Architect) |

## High Level Architecture

### Technical Summary

The Amazon Invoice Parser architecture follows a modern Node.js-based fullstack approach optimized for CLI-first development with web interface extensibility. The backend leverages Node.js with specialized PDF parsing capabilities, while the frontend provides both command-line interfaces and future web-based batch processing tools. The system is designed as a monorepo with clear separation between core parsing logic, CLI tools, and web components.

Key architectural decisions prioritize reliability, extensibility, and developer experience. The PDF parsing engine serves as the core competency, with modular design allowing for easy addition of new invoice formats and processing capabilities. Infrastructure choices focus on cost-effective deployment suitable for both individual developers and small teams.

### Platform and Infrastructure Choice

**Platform:** Vercel + Self-hosted Node.js CLI
**Key Services:** Vercel Functions (for future web deployment), Node.js runtime, npm registry
**Deployment Host and Regions:** Global CDN via npm, regional Vercel deployment for web components

**Rationale:** This hybrid approach supports the primary CLI use case while enabling web interface expansion. Vercel provides excellent developer experience and automatic scaling for web components, while npm distribution ensures the CLI tool remains accessible globally.

### Repository Structure

**Approach:** Monorepo with npm workspaces for shared code management

**Structure:**
```
/
├── packages/
│   ├── core/              # Core PDF parsing and data extraction logic
│   ├── cli/               # Command-line interface
│   ├── web/               # Web interface components (future)
│   └── shared/            # Common types, utilities, and schemas
├── apps/
│   ├── cli-app/          # Main CLI application
│   └── web-app/           # Web application (future)
├── tools/
│   ├── scripts/          # Build and deployment scripts
│   └── test-utils/       # Testing utilities and mocks
└── docs/                 # Documentation
```

**Benefits:**
- Shared code between CLI and web interfaces
- Consistent testing and build processes
- Easier refactoring and feature development
- Simplified dependency management

## Backend Architecture

### Technology Stack

**Runtime:** Node.js 18+ (LTS)
**Language:** JavaScript/TypeScript with ES modules
**Package Management:** npm workspaces for monorepo management

**Core Dependencies:**
- PDF parsing: `pdf-parse@1.1.1` (primary) with `pdf2pic` + OCR fallback
- Data validation: `joi` for schema validation
- CLI framework: `commander` for command-line interface
- Logging: `winston` for structured logging
- Testing: `jest` + `supertest` for unit and integration tests

### Service Architecture

**Pattern:** Modular monolith with clear service boundaries

**Core Services:**
1. **PDF Processing Service** - Handles PDF text extraction and initial parsing
2. **Data Extraction Service** - Applies business logic for invoice data identification
3. **Validation Service** - Ensures data consistency and quality
4. **Output Service** - Formats and exports data in requested formats
5. **Reporting Service** - Generates analytics and spending reports

**Communication:** Direct function calls with dependency injection. Services are organized as modules within the core package for easy testing and reuse.

### API Design

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

### Security Architecture

**Data Privacy:** All processing occurs locally, no external data transmission
**Input Validation:** Comprehensive file type and content validation
**Error Handling:** Secure error messages without exposing system details
**Dependency Security:** Regular security audits and dependency updates

## Frontend Architecture

### Technology Stack

**CLI Framework:** Node.js with Commander.js for argument parsing and help generation
**Future Web:** Next.js 14+ with App Router for web interface
**Styling:** Tailwind CSS for web components (future)
**State Management:** Zustand for client-side state (future)

### Component Architecture

**CLI Components:**
- Command parser and validator
- Progress indicators and status displays
- Error formatting and user feedback
- Output formatters (JSON, CSV, human-readable)

**Future Web Components:**
- File upload with drag-and-drop
- Processing status dashboard
- Results visualization
- Batch processing queue management

### User Experience Architecture

**Progressive Enhancement:** CLI-first with web interface as optional enhancement
**Responsive Design:** Web interface designed for desktop and mobile use
**Accessibility:** WCAG AA compliance for all web interfaces
**Performance:** Optimized for fast PDF processing and responsive UI

## Database Architecture

### Data Storage Strategy

**Primary:** File-based storage with JSON export for processed data
**Future Options:** SQLite for local data persistence, PostgreSQL for cloud deployment

### Data Models

**Core Entities:**
- Invoice: Complete parsed invoice data
- Item: Individual line items with descriptions and pricing
- ProcessingResult: Success/failure status and metadata
- Report: Generated analytics and summaries

**Schema Design:**
```javascript
// Invoice schema
{
  id: string,
  orderNumber: string,
  orderDate: Date,
  vendor: 'Amazon',
  currency: string,
  items: Item[],
  subtotal: number,
  shipping: number,
  tax: number,
  total: number,
  metadata: object
}
```

### Data Flow

**Processing Pipeline:**
1. PDF ingestion → Text extraction
2. Pattern matching → Structured data
3. Validation → Quality assurance
4. Formatting → Output generation

## Infrastructure Architecture

### Deployment Strategy

**CLI Distribution:** npm package for global installation
**Web Deployment:** Vercel for automatic scaling and CDN
**CI/CD:** GitHub Actions for automated testing and publishing

### Performance Architecture

**Processing Optimization:**
- Streaming PDF processing for large files
- Concurrent batch processing with worker pools
- Memory-efficient text extraction
- Caching for repeated patterns

**Scalability Considerations:**
- Horizontal scaling for web interface
- Queue-based processing for large batches
- CDN for static assets and documentation

## Integration Architecture

### External Service Integrations

**PDF Libraries:** Primary pdf-parse with OCR fallback
**Currency Conversion:** Optional integration with exchange rate APIs
**File Processing:** Local filesystem with future cloud storage options

### Third-Party Dependencies

**Core Dependencies:**
- pdf-parse: PDF text extraction
- commander: CLI framework
- winston: Logging framework
- joi/zod: Data validation
- jest: Testing framework

**Development Dependencies:**
- TypeScript: Type safety
- ESLint/Prettier: Code quality
- Husky: Git hooks

## Quality Assurance Architecture

### Testing Strategy

**Unit Tests:** Core parsing logic and utility functions
**Integration Tests:** End-to-end PDF processing workflows
**Performance Tests:** Large file processing and batch operations
**Compatibility Tests:** Multiple Node.js versions and platforms

### Test Data & Validation Resources

**Test Data Location:** `all_regions_test_data/` (project root)
**Real PDF Files:** 6 Amazon invoice/order documents (33KB - 127KB)
**Data Coverage:**
- Multiple Amazon order types and formats
- Various file sizes within the 10MB processing limit
- Real-world invoice structures for validation
**Current Status:** All test files parse successfully (100% success rate)
**Usage:** Primary validation for PDF parsing and data extraction logic

### Monitoring and Observability

**Logging:** Structured logging with Winston
**Error Tracking:** Comprehensive error categorization
**Performance Metrics:** Processing time and success rates
**User Feedback:** CLI output and future web interface notifications

## Development Architecture

### Developer Experience

**Local Development:**
- npm scripts for common tasks
- Hot reloading for web development (future)
- Comprehensive test suites
- Clear documentation and examples

**Code Organization:**
- Consistent file naming and structure
- Clear separation of concerns
- Comprehensive TypeScript types
- Modular architecture for easy testing

### Contribution Guidelines

**Code Standards:**
- ESLint configuration for consistent code style
- Pre-commit hooks for quality checks
- Comprehensive test coverage requirements
- Clear documentation for all public APIs

## Migration and Deployment Architecture

### Version Strategy

**Semantic Versioning:** Major.minor.patch for API stability
**Breaking Changes:** Major version bumps for CLI interface changes
**Deprecation:** Graceful migration paths for deprecated features

### Deployment Pipeline

**CLI Package:**
1. Automated testing on multiple Node.js versions
2. Build and packaging
3. npm publication
4. Cross-platform compatibility verification

**Web Application (Future):**
1. Automated testing and building
2. Vercel deployment
3. CDN invalidation
4. Performance monitoring

## Risk Mitigation Architecture

### Technical Risks

**PDF Parsing Reliability:**
- Multiple parsing libraries with fallback strategies
- Comprehensive error handling and recovery
- User feedback for unsupported formats

**Performance Issues:**
- Streaming processing for large files
- Memory usage monitoring
- Timeout handling for long-running operations

**Compatibility Issues:**
- Node.js version testing matrix
- Platform-specific handling
- Dependency version pinning

### Operational Risks

**Maintenance Burden:**
- Modular architecture for easy updates
- Comprehensive test coverage
- Clear documentation for future developers

**Security Concerns:**
- Input validation at all levels
- Secure error message handling
- Regular security audits

## Success Metrics Architecture

### Performance Benchmarks

**Processing Speed:** <5 seconds per invoice
**Accuracy:** >95% data extraction success rate
**Memory Usage:** <100MB per processing operation
**File Size Limit:** Support for invoices up to 10MB

### Quality Metrics

**Test Coverage:** >90% code coverage
**Error Rate:** <5% processing failures
**User Satisfaction:** Clear error messages and helpful documentation

## Implementation Roadmap

### Phase 1: Core CLI (Current)
- PDF parsing integration
- Basic data extraction
- CLI interface
- Unit and integration tests

### Phase 2: Enhanced Processing
- Multi-language support
- Advanced error recovery
- Batch processing optimization
- Performance improvements

### Phase 3: Web Interface (Future)
- Next.js web application
- Drag-and-drop file uploads
- Processing dashboard
- User account management

### Phase 4: Advanced Features (Future)
- Database integration
- Advanced reporting
- Multi-vendor support
- API integrations

## Conclusion

This architecture provides a solid foundation for the Amazon Invoice Parser, balancing current CLI requirements with future web interface capabilities. The modular design ensures maintainability and extensibility while the focus on developer experience enables efficient development and testing.

The chosen technologies and patterns align with the PRD requirements for reliability, performance, and cross-platform compatibility. The monorepo structure with clear package boundaries supports both the immediate CLI goals and future web expansion.
