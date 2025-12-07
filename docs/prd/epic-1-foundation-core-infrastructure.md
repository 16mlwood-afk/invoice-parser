# Epic 1: Foundation & Core Infrastructure

Establish project setup, PDF parsing capability, and basic data extraction for single invoices.

## Story 1.1: Project Setup and Basic Structure
As a developer,
I want a properly initialized Node.js project with basic structure,
so that I can begin implementing the core parsing functionality.

**Acceptance Criteria:**
1. Node.js project initialized with package.json
2. Basic project directory structure established
3. Git repository initialized with initial commit
4. Basic README and development setup documented

## Story 1.2: PDF Parsing Integration
As a developer,
I want to integrate a PDF parsing library,
so that I can extract text content from Amazon invoice PDFs.

**Acceptance Criteria:**
1. PDF parsing library selected and integrated
2. Basic PDF text extraction working
3. Error handling for invalid or corrupted PDF files
4. Text extraction preserves formatting and special characters

## Story 1.3: Basic Data Extraction Logic
As a developer,
I want basic parsing logic to extract order information,
so that I can identify key data fields from Amazon invoices.

**Acceptance Criteria:**
1. Order number extraction working
2. Order date parsing implemented
3. Basic item and price detection logic
4. Subtotal, tax, and total amount extraction

## Story 1.4: JSON Output Format
As a developer,
I want structured JSON output for extracted data,
so that the parsed data can be consumed by other applications.

**Acceptance Criteria:**
1. Standardized JSON schema defined
2. All extracted fields mapped to JSON structure
3. Currency and formatting preserved
4. Error handling for missing or invalid data
