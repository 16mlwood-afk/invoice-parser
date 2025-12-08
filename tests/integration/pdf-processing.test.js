const fs = require('fs');
const path = require('path');

describe('AmazonInvoiceParser - PDF Processing Integration', () => {
  const { parser, createMockPDFBuffer, validateInvoiceStructure, measureExecutionTime, OUTPUT_DIR } = integrationUtils;

  describe('Single PDF Processing', () => {
    test('should process a mock PDF buffer successfully', async () => {
      const mockText = `
Amazon.com Order Confirmation
Order #123-4567890-1234567
Order Placed: December 15, 2023

Items Ordered:
1 x Kindle Paperwhite $129.99
1 x Kindle Cover $29.99

Subtotal: $159.98
Shipping: $0.00
Tax: $12.80
Grand Total: $172.78

Payment Method: Visa ****1234
      `.trim();

      const pdfBuffer = createMockPDFBuffer(mockText);

      // Create temporary PDF file
      const tempFilePath = path.join(OUTPUT_DIR, 'integration-test-single.pdf');
      fs.writeFileSync(tempFilePath, pdfBuffer);

      try {
        const { result: invoice, executionTime } = await measureExecutionTime(
          () => parser.parseInvoice(tempFilePath)
        );

        // Validate processing time (should be reasonable)
        expect(executionTime).toBeLessThan(5000); // Less than 5 seconds

        // Validate invoice structure
        expect(invoice).toBeDefined();
        const structure = validateInvoiceStructure(invoice);
        expect(structure.hasRequiredFields).toBe(true);

        // Validate extracted data
        expect(invoice.orderNumber).toBe('123-4567890-1234567');
        expect(invoice.orderDate).toBe('2023-12-15'); // Date is normalized to ISO format
        expect(invoice.subtotal).toBe('$159.98');
        expect(invoice.total).toBe('$172.78');
        expect(invoice.vendor).toBe('Amazon');

      } finally {
        // Clean up
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    });

    test('should handle PDF processing errors gracefully', async () => {
      const invalidFilePath = path.join(OUTPUT_DIR, 'nonexistent.pdf');

      const { result: invoice, executionTime } = await measureExecutionTime(
        () => parser.parseInvoice(invalidFilePath)
      );

      expect(executionTime).toBeLessThan(2000); // Should fail quickly
      expect(invoice).toBeNull();
    });

    test('should validate PDF metadata extraction', async () => {
      const mockText = 'Simple test invoice content';
      const pdfBuffer = createMockPDFBuffer(mockText);

      const tempFilePath = path.join(OUTPUT_DIR, 'integration-test-metadata.pdf');
      fs.writeFileSync(tempFilePath, pdfBuffer);

      try {
        const invoice = await parser.parseInvoice(tempFilePath);

        expect(invoice).toBeDefined();
        expect(invoice.pdfMetadata).toBeDefined();
        expect(invoice.pdfMetadata).toHaveProperty('fileSize');
        expect(invoice.pdfMetadata).toHaveProperty('extractedAt');
        expect(invoice.pdfMetadata).toHaveProperty('extractionMethod');
        expect(invoice.pdfMetadata).toHaveProperty('pages');
        expect(invoice.pdfMetadata).toHaveProperty('textLength');

        expect(typeof invoice.pdfMetadata.fileSize).toBe('number');
        expect(invoice.pdfMetadata.fileSize).toBeGreaterThan(0);
        expect(invoice.pdfMetadata.extractionMethod).toBe('pdf-parse-library');
        expect(invoice.pdfMetadata.pages).toBeGreaterThan(0);

      } finally {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    });
  });

  describe('PDF Processing Performance', () => {
    test('should handle multiple PDFs concurrently', async () => {
      const mockInvoices = [
        {
          text: `Order #111-2223334-5556667\nTotal: $100.00`,
          expectedTotal: '$100.00'
        },
        {
          text: `Order #222-3334445-6667778\nTotal: $200.00`,
          expectedTotal: '$200.00'
        },
        {
          text: `Order #333-4445556-7778889\nTotal: $300.00`,
          expectedTotal: '$300.00'
        }
      ];

      const pdfBuffers = mockInvoices.map(inv => createMockPDFBuffer(inv.text));
      const tempFilePaths = [];

      try {
        // Create temporary files
        pdfBuffers.forEach((buffer, index) => {
          const filePath = path.join(OUTPUT_DIR, `integration-test-concurrent-${index}.pdf`);
          fs.writeFileSync(filePath, buffer);
          tempFilePaths.push(filePath);
        });

        // Process all PDFs concurrently
        const { result: invoices, executionTime } = await measureExecutionTime(
          () => Promise.all(tempFilePaths.map(path => parser.parseInvoice(path)))
        );

        expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
        expect(invoices).toHaveLength(3);
        expect(invoices.every(inv => inv !== null)).toBe(true);

      } finally {
        // Clean up
        tempFilePaths.forEach(filePath => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      }
    });

    test('should handle large PDF files efficiently', async () => {
      // Create a large text content
      const largeText = 'Sample invoice text\n'.repeat(1000) +
        'Order #123-4567890-1234567\n' +
        'Total: $1000.00\n' +
        'End of document';

      const pdfBuffer = createMockPDFBuffer(largeText);
      const tempFilePath = path.join(OUTPUT_DIR, 'integration-test-large.pdf');

      fs.writeFileSync(tempFilePath, pdfBuffer);

      try {
        const { result: invoice, executionTime } = await measureExecutionTime(
          () => parser.parseInvoice(tempFilePath)
        );

        expect(executionTime).toBeLessThan(8000); // Should handle large files reasonably fast
        expect(invoice).toBeDefined();
        expect(invoice.pdfMetadata.textLength).toBeGreaterThan(1000);

      } finally {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    });
  });

  describe('Data Validation Integration', () => {
    test('should include validation results in processed invoices', async () => {
      const mockText = `
Amazon.com Order Confirmation
Order #123-4567890-1234567
Order Placed: December 15, 2023
Subtotal: $159.98
Shipping: $0.00
Tax: $12.80
Grand Total: $172.78
      `.trim();

      const pdfBuffer = createMockPDFBuffer(mockText);
      const tempFilePath = path.join(OUTPUT_DIR, 'integration-test-validation.pdf');

      fs.writeFileSync(tempFilePath, pdfBuffer);

      try {
        const invoice = await parser.parseInvoice(tempFilePath);

        expect(invoice).toBeDefined();
        expect(invoice.validation).toBeDefined();
        expect(invoice.validation).toHaveProperty('score');
        expect(invoice.validation).toHaveProperty('isValid');
        expect(invoice.validation).toHaveProperty('warnings');
        expect(invoice.validation).toHaveProperty('errors');
        expect(invoice.validation).toHaveProperty('summary');

        expect(typeof invoice.validation.score).toBe('number');
        expect(Array.isArray(invoice.validation.warnings)).toBe(true);
        expect(Array.isArray(invoice.validation.errors)).toBe(true);

      } finally {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    });

    test('should detect validation issues in processed invoices', async () => {
      const mockText = `
Amazon.com Order Confirmation
Order #123-4567890-1234567
Order Placed: December 15, 2023
Subtotal: $100.00
Shipping: $10.00
Tax: $5.00
Grand Total: $200.00
      `.trim(); // Mathematical inconsistency: 100 + 10 + 5 = 115, not 200

      const pdfBuffer = createMockPDFBuffer(mockText);
      const tempFilePath = path.join(OUTPUT_DIR, 'integration-test-invalid.pdf');

      fs.writeFileSync(tempFilePath, pdfBuffer);

      try {
        const invoice = await parser.parseInvoice(tempFilePath);

        expect(invoice).toBeDefined();
        expect(invoice.validation).toBeDefined();
        expect(invoice.validation.score).toBeLessThan(100);
        expect(invoice.validation.errors.length).toBeGreaterThan(0);

      } finally {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    });
  });
});