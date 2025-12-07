# Requirements

## Functional Requirements

**FR1:** The system shall accept Amazon invoice PDF files as input via file path or directory path for batch processing.

**FR2:** The system shall extract and parse the following data fields from Amazon invoices:
- Order number/ID
- Order date
- Customer/recipient information
- Item descriptions and quantities
- Individual item prices
- Subtotal amounts
- Shipping costs
- Tax/VAT amounts
- Grand total
- Currency information

**FR3:** The system shall support multiple Amazon marketplace formats including English (US), German, French, and other major European markets.

**FR4:** The system shall handle multiple currencies (USD, EUR, GBP) with proper currency symbols and decimal formatting.

**FR5:** The system shall provide both single-file processing and batch processing capabilities for multiple invoices.

**FR6:** The system shall output structured JSON data compatible with expense tracking applications and accounting software.

**FR7:** The system shall generate summary reports including spending analytics and category breakdowns.

**FR8:** The system shall provide command-line interface for easy integration into automated workflows.

**FR9:** The system shall handle PDF parsing errors gracefully with meaningful error messages and partial data extraction when possible.

**FR10:** The system shall validate extracted data for consistency and flag potential errors or missing information.

## Non-Functional Requirements

**NFR1:** The system shall process individual invoices in under 5 seconds on standard hardware.

**NFR2:** The system shall achieve >95% accuracy in data extraction from properly formatted Amazon invoices.

**NFR3:** The system shall handle invoice files up to 10MB in size.

**NFR4:** The system shall be compatible with Node.js runtime environment (version 16+).

**NFR5:** The system shall provide clear, actionable error messages for common failure scenarios.

**NFR6:** The system shall be extensible to support additional invoice formats beyond Amazon.

**NFR7:** The system shall maintain data privacy and not transmit invoice data externally without explicit user consent.
