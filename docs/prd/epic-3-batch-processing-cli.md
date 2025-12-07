# Epic 3: Batch Processing & CLI

Implement batch processing capabilities and comprehensive command-line interface.

## Story 3.1: Single File CLI
As a user,
I want a command-line interface to process individual invoice files,
so that I can easily parse single invoices from the terminal.

**Acceptance Criteria:**
1. `node index.js <file.pdf>` command working
2. JSON output to console or file
3. Help documentation available
4. Error handling with clear messages

## Story 3.2: Directory Batch Processing
As a user with multiple invoices,
I want to process entire directories of invoice files,
so that I can efficiently handle bulk invoice processing.

**Acceptance Criteria:**
1. Directory input support (`node index.js <directory>`)
2. All PDF files in directory processed
3. Progress indication for batch operations
4. Summary report of successful/failed processing

## Story 3.3: Output File Options
As a user,
I want flexible output options for processed data,
so that I can direct output to files or integrate with other tools.

**Acceptance Criteria:**
1. `--output <file>` option for single files
2. `--output-dir <directory>` for batch operations
3. `--format json|csv` options
4. Overwrite protection and backup options
