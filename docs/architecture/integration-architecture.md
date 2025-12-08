# Integration Architecture

## External Service Integrations

**PDF Libraries:** Primary pdf-parse with OCR fallback
**Currency Conversion:** Optional integration with exchange rate APIs
**File Processing:** Local filesystem with future cloud storage options

## Third-Party Dependencies

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
