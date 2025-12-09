/**
 * Unit tests for PDF Cover Page Generator
 */

const PDFCoverPageGenerator = require('../src/utils/pdf-cover-page');
const PDFThemeEngine = require('../src/utils/pdf-theme-engine');
const { PDFDocument } = require('pdf-lib');

describe('PDFCoverPageGenerator', () => {
  let themeEngine;
  let pdfDoc;
  let coverPageGenerator;

  beforeEach(async () => {
    themeEngine = new PDFThemeEngine();
    pdfDoc = await PDFDocument.create();
    coverPageGenerator = new PDFCoverPageGenerator(themeEngine, pdfDoc);
  });

  describe('Initialization', () => {
    test('creates instance with theme engine and PDF document', () => {
      expect(coverPageGenerator.themeEngine).toBe(themeEngine);
      expect(coverPageGenerator.pdfDoc).toBe(pdfDoc);
      expect(coverPageGenerator.pageWidth).toBe(595);
      expect(coverPageGenerator.pageHeight).toBe(842);
    });
  });

  describe('Executive Summary Generation', () => {
    test('generates summary for successful processing', () => {
      const reportData = {
        summary: {
          totalInvoices: 5,
          totalSpent: 1234.56,
          successful: 5,
          failed: 0,
        },
      };

      const summary = coverPageGenerator.generateExecutiveSummary(reportData);
      expect(summary).toContain('5 invoices');
      expect(summary).toContain('$1,234.56');
      expect(summary).toContain('processed successfully');
    });

    test('generates summary with mixed results', () => {
      const reportData = {
        summary: {
          totalInvoices: 10,
          totalSpent: 2500.00,
          successful: 8,
          failed: 2,
        },
      };

      const summary = coverPageGenerator.generateExecutiveSummary(reportData);
      expect(summary).toContain('10 invoices');
      expect(summary).toContain('$2,500.00');
      expect(summary).toContain('80% successful');
    });

    test('handles empty report data', () => {
      const reportData = {};
      const summary = coverPageGenerator.generateExecutiveSummary(reportData);
      expect(summary).toContain('0 invoices');
    });
  });

  describe('Currency Formatting', () => {
    test('formats currency values correctly', () => {
      expect(coverPageGenerator.formatCurrency(1234.56)).toBe('$1,234.56');
      expect(coverPageGenerator.formatCurrency(0)).toBe('$0.00');
      expect(coverPageGenerator.formatCurrency(1000000)).toBe('$1,000,000.00');
    });
  });

  describe('Text Wrapping', () => {
    test('wraps long text into multiple lines', async () => {
      const font = await pdfDoc.embedFont('Helvetica');
      const longText = 'This is a very long text that should be wrapped into multiple lines when it exceeds the maximum width allowed for the page layout.';
      const maxWidth = 300; // Narrow width to force wrapping
      const fontSize = 11;

      const lines = coverPageGenerator.wrapText(longText, font, fontSize, maxWidth);
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('This is a very long text');
    });

    test('handles empty text', async () => {
      const font = await pdfDoc.embedFont('Helvetica');
      const lines = coverPageGenerator.wrapText('', font, 11, 300);
      expect(lines).toEqual([]);
    });

    test('handles single word', async () => {
      const font = await pdfDoc.embedFont('Helvetica');
      const lines = coverPageGenerator.wrapText('singleword', font, 11, 300);
      expect(lines).toEqual(['singleword']);
    });
  });

  describe('Status Indicators', () => {
    test('provides correct status indicator data', () => {
      expect(themeEngine.getStatusIndicator('success')).toEqual({ symbol: '✓', color: 'success' });
      expect(themeEngine.getStatusIndicator('warning')).toEqual({ symbol: '⚠', color: 'warning' });
      expect(themeEngine.getStatusIndicator('danger')).toEqual({ symbol: '✗', color: 'danger' });
      expect(themeEngine.getStatusIndicator('processing')).toEqual({ symbol: '⟳', color: 'processing' });
    });

    test('provides default for unknown status', () => {
      expect(themeEngine.getStatusIndicator('unknown')).toEqual({ symbol: '?', color: 'text' });
    });
  });

  describe('Theme Integration', () => {
    test('uses theme colors for PDF rendering', () => {
      const primaryColor = themeEngine.getPDFColor('primary');
      expect(primaryColor).toEqual({ red: 0.2, green: 0.4, blue: 0.8, type: 'RGB' });

      const textColor = themeEngine.getPDFColor('text');
      expect(textColor).toEqual({ red: 0.1, green: 0.1, blue: 0.1, type: 'RGB' });
    });

    test('uses theme typography settings', () => {
      expect(themeEngine.getFontSize('h1')).toBe(24);
      expect(themeEngine.getFontSize('body')).toBe(11);
      expect(themeEngine.getLineHeight('normal')).toBe(1.4);
    });

    test('uses theme layout settings', () => {
      const margins = themeEngine.getMargins();
      expect(margins).toEqual({ top: 50, right: 50, bottom: 50, left: 50 });

      expect(themeEngine.getSectionSpacing()).toBe(30);
      expect(themeEngine.getParagraphSpacing()).toBe(8);
    });
  });

  describe('Branding Integration', () => {
    test('provides branding information', () => {
      const branding = themeEngine.getBranding();
      expect(branding.companyName).toBe('Invoice Parser Pro');
      expect(branding.primaryColor).toEqual([0.2, 0.4, 0.8]);
    });

    test('checks logo availability', async () => {
      const exists = await themeEngine.logoExists();
      // Logo placeholder exists as a file, even though it's text
      expect(typeof exists).toBe('boolean');
    });
  });

  // Note: Integration tests that actually generate PDF pages would require
  // mocking the pdf-lib objects or creating temporary files, which is complex
  // for unit tests. These would be better suited for integration tests.
});