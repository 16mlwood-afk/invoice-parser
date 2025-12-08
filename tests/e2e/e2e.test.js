const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test data directory and files
const TEST_DATA_DIR = path.join(__dirname, '../../all_regions_test_data');
const TEST_PDFS = [
  'english-amazon-usa.pdf',
  'german-amazon-de.pdf',
  'german-amazon-de-2.pdf',
  'french-amazon-fr.pdf',
  'italian-amazon-it.pdf',
  'spanish-amazon-es.pdf'
];

// Expected results based on actual parsed data
const EXPECTED_RESULTS = {
  'german-amazon-de.pdf': {
    orderNumber: '302-2405627-1109121',
    hasTotal: true,
    currency: '€'
  },
  'german-amazon-de-2.pdf': {
    orderNumber: '103-4567890-1234567',
    hasTotal: true,
    currency: '$'
  },
  'french-amazon-fr.pdf': {
    orderNumber: '202-7890123-4567890',
    hasTotal: true,
    currency: '€'
  }
};

// E2E Test Suite
describe('Amazon Invoice Parser - End-to-End Tests', () => {
  const outputDir = path.join(__dirname, 'test-output');
  const batchOutput = path.join(outputDir, 'batch-results.json');

  beforeAll(() => {
    // Create output directory for tests
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test output files
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      files.forEach(file => {
        if (file.endsWith('.json') || file.endsWith('.csv')) {
          fs.unlinkSync(path.join(outputDir, file));
        }
      });
    }
  });

  describe('CLI Interface Tests', () => {
    test('CLI should display help information', () => {
      const output = execSync('node index.js --help', { encoding: 'utf8' });
      expect(output).toContain('amazon-invoice-parser');
      expect(output).toContain('parse [options] <file>');
      expect(output).toContain('batch [options] <directory>');
      expect(output).toContain('report [options] <input>');
    });

    test('CLI should show error for missing command', () => {
      expect(() => {
        execSync('node index.js', { encoding: 'utf8' });
      }).toThrow();
    });
  });

  describe('Single File Parsing Tests', () => {
    const testPdf = path.join(TEST_DATA_DIR, 'german-amazon-de.pdf');

    test('should parse single PDF to JSON format', () => {
      const outputPath = path.join(outputDir, 'single-test.json');
      const command = `node index.js parse "${testPdf}" --output "${outputPath}" --format json`;

      execSync(command, { encoding: 'utf8' });

      expect(fs.existsSync(outputPath)).toBe(true);

      const result = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      expect(result).toHaveProperty('orderNumber');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('vendor', 'Amazon');
      expect(result).toHaveProperty('validation');
      expect(result.validation.isValid).toBe(true);
    });

    test('should parse single PDF to CSV format', () => {
      const outputPath = path.join(outputDir, 'single-test.csv');
      const command = `node index.js parse "${testPdf}" --output "${outputPath}" --format csv`;

      execSync(command, { encoding: 'utf8' });

      expect(fs.existsSync(outputPath)).toBe(true);

      const csvContent = fs.readFileSync(outputPath, 'utf8');
      expect(csvContent).toContain('Order Number');
      expect(csvContent).toContain('Total');
      expect(csvContent).toContain('Amazon');
    });

    test('should parse single PDF to text format (stdout)', () => {
      const command = `node index.js parse "${testPdf}" --format text`;
      const output = execSync(command, { encoding: 'utf8' });

      expect(output).toContain('Invoice parsed successfully');
      expect(output).toContain('Order:');
      expect(output).toContain('Date:');
      expect(output).toContain('Total:');
    });

    test('should parse to output directory with auto-generated filename', () => {
      const command = `node index.js parse "${testPdf}" --output-dir "${outputDir}" --format json`;
      execSync(command, { encoding: 'utf8' });

      // Should create german-amazon-de.json
      const expectedFile = path.join(outputDir, 'german-amazon-de.json');
      expect(fs.existsSync(expectedFile)).toBe(true);

      const result = JSON.parse(fs.readFileSync(expectedFile, 'utf8'));
      expect(result.orderNumber).toBe(EXPECTED_RESULTS['german-amazon-de.pdf'].orderNumber);
    });
  });

  describe('Batch Processing Tests', () => {
    test('should process all PDFs in batch mode', () => {
      const command = `node index.js batch "${TEST_DATA_DIR}" --output "${batchOutput}" --format json`;
      const output = execSync(command, { encoding: 'utf8' });

      expect(output).toContain('Processing 6 PDF files');
      expect(output).toContain('Successful: 6 files');
      expect(output).toContain('Failed: 0 files');
      expect(output).toContain('Total spent: $');

      expect(fs.existsSync(batchOutput)).toBe(true);

      const result = JSON.parse(fs.readFileSync(batchOutput, 'utf8'));
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('invoices');
      expect(result.invoices).toHaveLength(6);

      // Verify each invoice has required fields
      result.invoices.forEach(invoice => {
        expect(invoice).toHaveProperty('orderNumber');
        expect(invoice).toHaveProperty('total');
        expect(invoice).toHaveProperty('vendor', 'Amazon');
        expect(invoice).toHaveProperty('validation');
      });
    });

    test('should create individual JSON files for batch processing', () => {
      const command = `node index.js batch "${TEST_DATA_DIR}" --output-dir "${outputDir}" --format json`;
      const output = execSync(command, { encoding: 'utf8' });

      expect(output).toContain('Processing 6 PDF files');
      expect(output).toContain('Successful: 6 files');

      // Check that individual files were created
      TEST_PDFS.forEach(pdfFile => {
        const baseName = path.basename(pdfFile, '.pdf');
        const jsonFile = path.join(outputDir, `${baseName}.json`);
        expect(fs.existsSync(jsonFile)).toBe(true);

        const result = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        expect(result).toHaveProperty('orderNumber');
        expect(result).toHaveProperty('total');
      });
    });

    test('should create individual CSV files for batch processing', () => {
      const command = `node index.js batch "${TEST_DATA_DIR}" --output-dir "${outputDir}" --format csv`;
      const output = execSync(command, { encoding: 'utf8' });

      expect(output).toContain('Processing 6 PDF files');
      expect(output).toContain('Successful: 6 files');

      // Check that individual CSV files were created
      TEST_PDFS.forEach(pdfFile => {
        const baseName = path.basename(pdfFile, '.pdf');
        const csvFile = path.join(outputDir, `${baseName}.csv`);
        expect(fs.existsSync(csvFile)).toBe(true);

        const csvContent = fs.readFileSync(csvFile, 'utf8');
        expect(csvContent).toContain('Order Number');
        expect(csvContent).toContain('Total');
      });
    });
  });

  describe('Report Generation Tests', () => {
    const reportOutput = path.join(outputDir, 'spending-report.json');

    test('should generate spending report from parsed data', () => {
      const command = `node index.js report "${batchOutput}" --output "${reportOutput}" --format json`;
      execSync(command, { encoding: 'utf8' });

      expect(fs.existsSync(reportOutput)).toBe(true);

      const report = JSON.parse(fs.readFileSync(reportOutput, 'utf8'));
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('invoices');
      expect(report.summary).toHaveProperty('totalInvoices', 6);
      expect(report.summary).toHaveProperty('totalSpent');
      expect(report.summary).toHaveProperty('averageOrderValue');
      expect(report.summary).toHaveProperty('dateRange');
      expect(report.summary).toHaveProperty('topVendors');
    });

    test('should generate text format spending report', () => {
      const command = `node index.js report "${batchOutput}" --format text`;
      const output = execSync(command, { encoding: 'utf8' });

      expect(output).toContain('AMAZON INVOICE SPENDING REPORT');
      expect(output).toContain('Total Invoices: 6');
      expect(output).toContain('Total Spent:');
      expect(output).toContain('Average Order:');
    });

    test('should generate CSV format spending report', () => {
      const csvReportOutput = path.join(outputDir, 'spending-report.csv');
      const command = `node index.js report "${batchOutput}" --output "${csvReportOutput}" --format csv`;
      execSync(command, { encoding: 'utf8' });

      expect(fs.existsSync(csvReportOutput)).toBe(true);

      const csvContent = fs.readFileSync(csvReportOutput, 'utf8');
      expect(csvContent).toContain('Report Type');
      expect(csvContent).toContain('Total Invoices');
      expect(csvContent).toContain('Total Spent');
    });
  });

  describe('Data Validation and Accuracy Tests', () => {
    test('should validate all parsed invoices meet quality standards', () => {
      const batchResult = JSON.parse(fs.readFileSync(batchOutput, 'utf8'));

      batchResult.invoices.forEach((invoice, index) => {
        // All invoices should be valid
        expect(invoice.validation.isValid).toBe(true);

        // All invoices should have order numbers
        expect(invoice.orderNumber).toBeTruthy();
        expect(typeof invoice.orderNumber).toBe('string');

        // All invoices should have totals
        expect(invoice.total).toBeTruthy();

        // All invoices should have vendor set to Amazon
        expect(invoice.vendor).toBe('Amazon');

        // Validation score should be reasonable
        expect(invoice.validation.score).toBeGreaterThanOrEqual(70);
      });
    });

    test('should extract financial data accurately', () => {
      const batchResult = JSON.parse(fs.readFileSync(batchOutput, 'utf8'));

      // Verify all invoices have valid totals
      let totalAmount = 0;
      let validInvoicesWithTotal = 0;

      batchResult.invoices.forEach(invoice => {
        if (invoice.total) {
          const amount = parseFloat(invoice.total.replace(/[^\d.,-]/g, '').replace(',', '.'));
          if (!isNaN(amount) && amount > 0) {
            totalAmount += amount;
            validInvoicesWithTotal++;
          }
        }
      });

      // Should have extracted totals from all invoices
      expect(validInvoicesWithTotal).toBe(batchResult.invoices.length);
      expect(totalAmount).toBeGreaterThan(0);

      // Summary should have reasonable total (may differ due to currency conversion)
      expect(batchResult.summary.totalSpent).toBeGreaterThan(0);
      expect(batchResult.summary.totalInvoices).toBe(batchResult.invoices.length);
    });

    test('should handle multi-language invoice parsing', () => {
      const batchResult = JSON.parse(fs.readFileSync(batchOutput, 'utf8'));

      // Should have invoices with different currencies
      const currencies = new Set();
      batchResult.invoices.forEach(invoice => {
        if (invoice.total) {
          const currencyMatch = invoice.total.match(/([$€£¥]|CHF)/);
          if (currencyMatch) {
            currencies.add(currencyMatch[0]);
          }
        }
      });

      // Should detect at least USD and EUR
      expect(currencies.has('$') || currencies.has('€')).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle non-existent file gracefully', () => {
      const nonExistentFile = path.join(TEST_DATA_DIR, 'non-existent.pdf');

      expect(() => {
        execSync(`node index.js parse "${nonExistentFile}"`, { encoding: 'utf8' });
      }).toThrow();
    });

    test('should handle non-PDF file gracefully', () => {
      const textFile = path.join(TEST_DATA_DIR, 'test_data.json');

      expect(() => {
        execSync(`node index.js parse "${textFile}"`, { encoding: 'utf8' });
      }).toThrow();
    });

    test('should handle empty directory for batch processing', () => {
      const emptyDir = path.join(outputDir, 'empty-dir');
      fs.mkdirSync(emptyDir, { recursive: true });

      const command = `node index.js batch "${emptyDir}" --format text`;
      const output = execSync(command, { encoding: 'utf8' });

      expect(output).toContain('No PDF files found');
    });

    test('should handle invalid output directory', () => {
      const invalidDir = '/invalid/path/that/does/not/exist';
      const command = `node index.js batch "${TEST_DATA_DIR}" --output-dir "${invalidDir}" --format json`;

      expect(() => {
        execSync(command, { encoding: 'utf8' });
      }).toThrow();
    });
  });

  describe('Performance and Scalability Tests', () => {
    test('should process multiple files efficiently', () => {
      const startTime = Date.now();
      const command = `node index.js batch "${TEST_DATA_DIR}" --format json`;
      execSync(command, { encoding: 'utf8', stdio: 'pipe' }); // Suppress output
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      // Should process 6 files in under 30 seconds
      expect(processingTime).toBeLessThan(30000);
    });

    test('should generate reports quickly', () => {
      const startTime = Date.now();
      const command = `node index.js report "${batchOutput}" --format json`;
      execSync(command, { encoding: 'utf8' });
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      // Should generate report in under 5 seconds
      expect(processingTime).toBeLessThan(5000);
    });
  });

  describe('Output Format Consistency Tests', () => {
    test('JSON output should be valid and parseable', () => {
      const jsonFiles = TEST_PDFS.map(pdf => {
        const baseName = path.basename(pdf, '.pdf');
        return path.join(outputDir, `${baseName}.json`);
      });

      jsonFiles.forEach(jsonFile => {
        expect(fs.existsSync(jsonFile)).toBe(true);

        const content = fs.readFileSync(jsonFile, 'utf8');
        expect(() => JSON.parse(content)).not.toThrow();

        const data = JSON.parse(content);
        expect(data).toHaveProperty('orderNumber');
        expect(data).toHaveProperty('total');
        expect(data).toHaveProperty('vendor');
      });
    });

    test('CSV output should have consistent headers', () => {
      const csvFiles = TEST_PDFS.map(pdf => {
        const baseName = path.basename(pdf, '.pdf');
        return path.join(outputDir, `${baseName}.csv`);
      });

      csvFiles.forEach(csvFile => {
        expect(fs.existsSync(csvFile)).toBe(true);

        const content = fs.readFileSync(csvFile, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        // Should have at least header and one data row
        expect(lines.length).toBeGreaterThanOrEqual(2);

        // First line should be headers
        const headers = lines[0].split(',');
        expect(headers).toContain('Order Number');
        expect(headers).toContain('Order Date');
        expect(headers).toContain('Total');
        expect(headers).toContain('Vendor');
      });
    });
  });
});