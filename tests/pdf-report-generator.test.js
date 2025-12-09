/**
 * Unit tests for PDF Report Generator
 */

jest.mock('../config/export.config', () => ({
  PDF: {
    PAGE_SIZE: [595, 842],
    MARGINS: {
      TOP: 50,
      BOTTOM: 50,
      LEFT: 50,
      RIGHT: 50
    },
    CONTENT_WIDTH: 495,
    COLORS: {
      PRIMARY: [0.2, 0.4, 0.8],
      SECONDARY: [0.8, 0.4, 0.2],
      SUCCESS: [0.2, 0.8, 0.4],
      WARNING: [0.8, 0.8, 0.2],
      DANGER: [0.8, 0.2, 0.2],
      TEXT: [0.2, 0.2, 0.2],
      TEXT_LIGHT: [0.6, 0.6, 0.6],
      BACKGROUND: [0.95, 0.95, 0.95]
    },
    FONT_SIZES: {
      HEADER: 16,
      SECTION_TITLE: 14,
      METRIC_LABEL: 9,
      METRIC_VALUE: 12,
      TABLE_HEADER: 9,
      TABLE_CELL: 8,
      FOOTER: 7,
      TIMESTAMP: 8,
      PAGE_NUMBER: 8
    },
    SPACING: {
      HEADER_HEIGHT: 60,
      FOOTER_HEIGHT: 50,
      ROW_HEIGHT: 20,
      SECTION_SPACING: 30,
      METRIC_BOX_HEIGHT: 30,
      METRIC_BOX_WIDTH: 242.5,
      BAR_CHART_HEIGHT: 120,
      BAR_CHART_WIDTH: 495,
      TABLE_ROW_SPACING: 20
    },
    TABLE_COLUMN_WIDTHS: {
      INVOICE_DETAILS: [80, 70, 120, 50, 70, 60],
      ERRORS: [200, 295]
    }
  }
}));

const PDFReportGenerator = require('../src/utils/pdf-report-generator');

// Mock pdf-lib
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: jest.fn()
  },
  rgb: jest.fn((...args) => args),
  StandardFonts: {
    Helvetica: 'Helvetica',
    HelveticaBold: 'HelveticaBold'
  }
}));

describe('PDFReportGenerator', () => {
  let generator;
  let mockPDFDoc;
  let mockHelvetica;
  let mockHelveticaBold;

  const mockInvoices = [
    {
      filename: 'invoice1.pdf',
      orderNumber: 'ORD-001',
      orderDate: '2024-01-01',
      customerInfo: { name: 'John Doe', email: 'john@example.com' },
      items: [
        { description: 'Item 1', quantity: 2, unitPrice: 10.00, total: 20.00 },
        { description: 'Item 2', quantity: 1, unitPrice: 15.00, total: 15.00 }
      ],
      totals: { subtotal: 35.00, shipping: 5.00, tax: 3.50, total: 43.50 },
      currency: 'USD',
      validationStatus: 'valid',
      validationErrors: []
    }
  ];

  const mockJobId = 'job_123';
  const mockSummary = {
    totalFiles: 1,
    processedFiles: 1,
    failedFiles: 0,
    successRate: 100
  };
  const mockErrors = [];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock PDF document and fonts
    mockHelvetica = {
      widthOfTextAtSize: jest.fn().mockReturnValue(50)
    };
    mockHelveticaBold = {
      widthOfTextAtSize: jest.fn().mockReturnValue(60)
    };

    mockPDFDoc = {
      addPage: jest.fn().mockReturnValue({
        drawText: jest.fn(),
        drawRectangle: jest.fn(),
        drawLine: jest.fn()
      }),
      embedFont: jest.fn()
        .mockResolvedValueOnce(mockHelvetica)
        .mockResolvedValueOnce(mockHelveticaBold),
      getPageCount: jest.fn().mockReturnValue(1),
      save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]))
    };

    require('pdf-lib').PDFDocument.create.mockResolvedValue(mockPDFDoc);

    generator = new PDFReportGenerator();
    // Initialize config and PDF document for tests that call methods directly
    generator.setupColors();
    generator.pdfDoc = mockPDFDoc;
    generator.helvetica = mockHelvetica;
    generator.helveticaBold = mockHelveticaBold;
    generator.currentPage = mockPDFDoc.addPage();
  });

  describe('constructor', () => {
    test('should initialize with default config', () => {
      const gen = new PDFReportGenerator();
      expect(gen.config).toBeDefined();
    });

    test('should merge custom config with defaults', () => {
      const customConfig = { pageSize: [800, 600] };
      const gen = new PDFReportGenerator(customConfig);
      expect(gen.config.pageSize).toEqual([800, 600]);
    });
  });

  describe('generateReport', () => {
    test('should create PDF document and return buffer', async () => {
      const result = await generator.generateReport(mockInvoices, mockJobId, mockSummary, mockErrors, 'detailed');

      expect(require('pdf-lib').PDFDocument.create).toHaveBeenCalled();
      expect(mockPDFDoc.embedFont).toHaveBeenCalledWith('Helvetica');
      expect(mockPDFDoc.embedFont).toHaveBeenCalledWith('HelveticaBold');
      expect(mockPDFDoc.save).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });

    test('should call appropriate report generation method based on template', async () => {
      const spyDetailed = jest.spyOn(generator, 'generateDetailedReport');
      const spySummary = jest.spyOn(generator, 'generateSummaryReport');
      const spyFinancial = jest.spyOn(generator, 'generateFinancialReport');

      await generator.generateReport(mockInvoices, mockJobId, mockSummary, mockErrors, 'detailed');
      expect(spyDetailed).toHaveBeenCalled();

      await generator.generateReport(mockInvoices, mockJobId, mockSummary, mockErrors, 'summary');
      expect(spySummary).toHaveBeenCalled();

      await generator.generateReport(mockInvoices, mockJobId, mockSummary, mockErrors, 'financial');
      expect(spyFinancial).toHaveBeenCalled();
    });

    test('should default to detailed template', async () => {
      const spyDetailed = jest.spyOn(generator, 'generateDetailedReport');

      await generator.generateReport(mockInvoices, mockJobId, mockSummary, mockErrors);

      expect(spyDetailed).toHaveBeenCalled();
    });
  });

  describe('setupColors', () => {
    test('should set up color scheme from config', () => {
      generator.setupColors();

      expect(generator.colors.primary).toEqual([0.2, 0.4, 0.8]);
      expect(generator.colors.secondary).toEqual([0.8, 0.4, 0.2]);
      expect(generator.colors.success).toEqual([0.2, 0.8, 0.4]);
      expect(generator.colors.danger).toEqual([0.8, 0.2, 0.2]);
    });
  });

  describe('addNewPage', () => {
    test('should add new page and draw header', () => {
      generator.setupColors();
      const page = generator.addNewPage();

      expect(mockPDFDoc.addPage).toHaveBeenCalled();
      expect(page).toBeDefined();
    });
  });

  describe('drawHeader', () => {
    test('should draw header with job info and page number', () => {
      const mockPage = {
        drawText: jest.fn()
      };
      generator.currentPage = mockPage;
      generator.pdfDoc = { getPageCount: () => 1 };

      generator.drawHeader(mockJobId);

      expect(mockPage.drawText).toHaveBeenCalledWith(
        'Invoice Processing Report',
        expect.objectContaining({ size: 16 })
      );
      expect(mockPage.drawText).toHaveBeenCalledWith(
        expect.stringContaining(`Job: ${mockJobId}`),
        expect.any(Object)
      );
      expect(mockPage.drawText).toHaveBeenCalledWith(
        'Page 1',
        expect.any(Object)
      );
    });
  });

  describe('drawFooter', () => {
    test('should draw footer text', () => {
      const mockPage = {
        drawText: jest.fn()
      };
      generator.currentPage = mockPage;

      generator.drawFooter();

      expect(mockPage.drawText).toHaveBeenCalledWith(
        'Generated by Invoice Parser - Professional Invoice Processing Solution',
        expect.any(Object)
      );
    });
  });

  describe('checkPageSpace', () => {
    test('should return false when space is available', () => {
      generator.yPosition = 500;
      const result = generator.checkPageSpace(100);
      expect(result).toBe(false);
    });

    test('should add new page when space is insufficient', () => {
      generator.yPosition = 100;
      const spyAddPage = jest.spyOn(generator, 'addNewPage');
      const spyDrawFooter = jest.spyOn(generator, 'drawFooter');

      const result = generator.checkPageSpace(200);

      expect(result).toBe(true);
      expect(spyDrawFooter).toHaveBeenCalled();
      expect(spyAddPage).toHaveBeenCalled();
    });
  });

  describe('drawText', () => {
    test('should draw text with default options', () => {
      const mockPage = {
        drawText: jest.fn()
      };
      generator.currentPage = mockPage;

      generator.drawText('Test text', 100, 200);

      expect(mockPage.drawText).toHaveBeenCalledWith('Test text', {
        x: 100,
        y: 200,
        size: 8, // default from config
        font: mockHelvetica,
        color: expect.any(Array),
        maxWidth: 495, // default content width
        align: 'left'
      });
    });

    test('should handle text alignment', () => {
      const mockPage = {
        drawText: jest.fn()
      };
      generator.currentPage = mockPage;

      // Test center alignment
      generator.drawText('Center', 200, 300, { align: 'center' });
      expect(mockPage.drawText).toHaveBeenCalledWith('Center', {
        x: 175, // 200 - (50/2) where 50 is mock width
        y: 300,
        size: 8,
        font: mockHelvetica,
        color: expect.any(Array),
        maxWidth: 495,
        align: 'center'
      });
    });
  });

  describe('drawTable', () => {
    test('should draw table with headers and rows', () => {
      const mockPage = {
        drawRectangle: jest.fn(),
        drawText: jest.fn()
      };
      generator.currentPage = mockPage;

      const headers = ['Col1', 'Col2'];
      const rows = [['Data1', 'Data2']];

      generator.drawTable(headers, rows, 50, 500);

      expect(mockPage.drawRectangle).toHaveBeenCalled(); // Header background
      expect(mockPage.drawText).toHaveBeenCalledTimes(3); // Header + 2 data cells
    });

    test('should handle alternating row colors', () => {
      const mockPage = {
        drawRectangle: jest.fn(),
        drawText: jest.fn()
      };
      generator.currentPage = mockPage;

      const headers = ['Col1'];
      const rows = [['Row1'], ['Row2'], ['Row3']];

      generator.drawTable(headers, rows, 50, 500, { alternateRowColor: true });

      // Should draw background for second row (index 1, which is odd)
      expect(mockPage.drawRectangle).toHaveBeenCalledTimes(2); // Header + 1 alternating row
    });
  });

  describe('drawBarChart', () => {
    test('should draw bar chart with title and bars', () => {
      const mockPage = {
        drawRectangle: jest.fn(),
        drawText: jest.fn()
      };
      generator.currentPage = mockPage;

      const data = [
        { label: 'Q1', value: 100 },
        { label: 'Q2', value: 150 }
      ];

      generator.drawBarChart(data, 50, 400, 300, 200, { title: 'Sales Chart' });

      expect(mockPage.drawText).toHaveBeenCalledWith('Sales Chart', expect.any(Object));
      expect(mockPage.drawRectangle).toHaveBeenCalledTimes(2); // Two bars
    });
  });

  describe('addSummarySection', () => {
    test('should add summary section with metrics', () => {
      const spyDrawText = jest.spyOn(generator, 'drawText');
      const mockPage = {
        drawRectangle: jest.fn(),
        drawText: jest.fn()
      };
      generator.currentPage = mockPage;
      generator.colors = {
        primary: [0, 0, 0],
        success: [0, 1, 0],
        danger: [1, 0, 0],
        warning: [1, 1, 0]
      };

      generator.addSummarySection(mockSummary);

      expect(spyDrawText).toHaveBeenCalledWith('Executive Summary', expect.any(Number), expect.any(Number), expect.any(Object));
      expect(mockPage.drawRectangle).toHaveBeenCalledTimes(4); // Four metric boxes
    });
  });

  describe('addFinancialOverview', () => {
    test('should add financial overview with chart', () => {
      const spyDrawText = jest.spyOn(generator, 'drawText');
      const spyDrawBarChart = jest.spyOn(generator, 'drawBarChart');

      generator.addFinancialOverview(mockInvoices);

      expect(spyDrawText).toHaveBeenCalledWith('Financial Overview', expect.any(Number), expect.any(Number), expect.any(Object));
      expect(spyDrawBarChart).toHaveBeenCalled();
    });

    test('should skip chart when no financial data available', () => {
      const spyDrawBarChart = jest.spyOn(generator, 'drawBarChart');

      generator.addFinancialOverview([]);

      expect(spyDrawBarChart).not.toHaveBeenCalled();
    });
  });

  describe('addInvoiceTable', () => {
    test('should add invoice details table', () => {
      const spyDrawText = jest.spyOn(generator, 'drawText');
      const spyDrawTable = jest.spyOn(generator, 'drawTable');

      generator.addInvoiceTable(mockInvoices);

      expect(spyDrawText).toHaveBeenCalledWith('Invoice Details', expect.any(Number), expect.any(Number), expect.any(Object));
      expect(spyDrawTable).toHaveBeenCalled();
    });
  });

  describe('addErrorSection', () => {
    test('should add error section when errors exist', () => {
      const spyDrawText = jest.spyOn(generator, 'drawText');
      const spyDrawTable = jest.spyOn(generator, 'drawTable');

      const errors = [
        { filename: 'error.pdf', error: 'Parse failed' }
      ];

      generator.addErrorSection(errors);

      expect(spyDrawText).toHaveBeenCalledWith('Processing Errors', expect.any(Number), expect.any(Number), expect.any(Object));
      expect(spyDrawTable).toHaveBeenCalled();
    });

    test('should skip error section when no errors', () => {
      const spyDrawText = jest.spyOn(generator, 'drawText');

      generator.addErrorSection([]);

      expect(spyDrawText).not.toHaveBeenCalledWith('Processing Errors', expect.any(Number), expect.any(Number), expect.any(Object));
    });
  });

  describe('Report Generation Methods', () => {
    test('generateSummaryReport should call appropriate sections', () => {
      const spySummary = jest.spyOn(generator, 'addSummarySection');
      const spyErrors = jest.spyOn(generator, 'addErrorSection');

      generator.generateSummaryReport(mockInvoices, mockJobId, mockSummary, mockErrors);

      expect(spySummary).toHaveBeenCalledWith(mockSummary);
      expect(spyErrors).toHaveBeenCalledWith(mockErrors);
    });

    test('generateDetailedReport should call all sections', () => {
      const spySummary = jest.spyOn(generator, 'addSummarySection');
      const spyFinancial = jest.spyOn(generator, 'addFinancialOverview');
      const spyTable = jest.spyOn(generator, 'addInvoiceTable');
      const spyErrors = jest.spyOn(generator, 'addErrorSection');

      generator.generateDetailedReport(mockInvoices, mockJobId, mockSummary, mockErrors);

      expect(spySummary).toHaveBeenCalled();
      expect(spyFinancial).toHaveBeenCalled();
      expect(spyTable).toHaveBeenCalled();
      expect(spyErrors).toHaveBeenCalled();
    });

    test('generateFinancialReport should only call financial section', () => {
      const spyFinancial = jest.spyOn(generator, 'addFinancialOverview');
      const spySummary = jest.spyOn(generator, 'addSummarySection');

      generator.generateFinancialReport(mockInvoices, mockJobId, mockSummary, mockErrors);

      expect(spyFinancial).toHaveBeenCalled();
      expect(spySummary).not.toHaveBeenCalled();
    });
  });
});