/**
 * Unit tests for export API functionality
 */

const request = require('supertest');
const express = require('express');
const exportRoutes = require('../src/api/export');

// Mock dependencies
jest.mock('../src/utils/result-transformer');
jest.mock('../src/utils/pdf-report-generator');
jest.mock('../config/export.config', () => ({
  VALID_FORMATS: ['json', 'csv', 'pdf'],
  VALID_TEMPLATES: ['summary', 'detailed', 'financial'],
  LIMITS: {
    MAX_RECORDS: 5000,
    PDF_MAX_INVOICES: 500,
    WARNING_THRESHOLD: 4000
  },
  ERRORS: {
    CODES: {
      EXPORT_ERROR: 'EXPORT_ERROR',
      INVALID_FORMAT: 'INVALID_FORMAT',
      INVALID_TEMPLATE: 'INVALID_TEMPLATE',
      JOB_NOT_FOUND: 'JOB_NOT_FOUND',
      JOB_NOT_COMPLETED: 'JOB_NOT_COMPLETED',
      LIMIT_EXCEEDED: 'LIMIT_EXCEEDED'
    },
    MESSAGES: {
      INVALID_FORMAT: 'Format must be one of: json, csv, pdf',
      INVALID_TEMPLATE: 'PDF template must be one of: summary, detailed, financial',
      JOB_NOT_FOUND: 'The specified job ID does not exist',
      JOB_NOT_COMPLETED: 'The job is still processing. Export is only available for completed jobs.',
      LIMIT_EXCEEDED: 'Export limit exceeded. Reduce the number of records or use pagination.',
      EXPORT_FAILED: 'An error occurred while generating the export. Please try again or contact support.'
    }
  },
  FILENAME: {
    PREFIX: 'invoice-results',
    SANITIZE_PATTERN: /[^a-zA-Z0-9_-]/g,
    SANITIZE_REPLACEMENT: ''
  },
  PDF: {
    PAGE_SIZE: [595, 842],
    MARGINS: { TOP: 50, BOTTOM: 50, LEFT: 50, RIGHT: 50 },
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
  },
  CSV: {
    HEADERS: [
      'Filename',
      'Order Number',
      'Order Date',
      'Customer Name',
      'Customer Email',
      'Item Description',
      'Item Quantity',
      'Item Unit Price',
      'Item Total',
      'Subtotal',
      'Shipping',
      'Tax',
      'Total',
      'Currency',
      'Validation Status',
      'Validation Errors',
      'Processed At'
    ]
  }
}));

const { transformResultsForExport } = require('../src/utils/result-transformer');
const PDFReportGenerator = require('../src/utils/pdf-report-generator');

describe('Export API', () => {
  let app;
  let mockProcessingAPI;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create Express app
    app = express();
    app.use(express.json());

    // Create mock ProcessingAPI
    mockProcessingAPI = {
      getJobStatus: jest.fn(),
      getJobResults: jest.fn()
    };

    // Apply export routes with mock API
    exportRoutes(app, mockProcessingAPI);
  });

  describe('GET /api/export/:jobId', () => {
    const validJobId = 'job_123';
    const invalidJobId = 'invalid_job';

    describe('Parameter Validation', () => {
      test('should return 400 for invalid job ID format', async () => {
        const response = await request(app)
          .get(`/api/export/${invalidJobId}`)
          .query({ format: 'json' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid job ID');
        expect(response.body.message).toBe('Job ID must be provided and start with "job_"');
      });

      test('should return 400 for invalid format', async () => {
        const response = await request(app)
          .get(`/api/export/${validJobId}`)
          .query({ format: 'invalid' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid format');
        expect(response.body.errorCode).toBe('INVALID_FORMAT');
      });

      test('should return 400 for invalid PDF template', async () => {
        const response = await request(app)
          .get(`/api/export/${validJobId}`)
          .query({ format: 'pdf', template: 'invalid' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid template');
        expect(response.body.errorCode).toBe('INVALID_TEMPLATE');
      });
    });

    describe('Job Status Handling', () => {
      test('should return 404 when job not found', async () => {
        mockProcessingAPI.getJobStatus.mockImplementation(() => {
          throw new Error('Job not found');
        });
        mockProcessingAPI.getJobResults.mockReturnValue([]);

        const response = await request(app)
          .get(`/api/export/${validJobId}`)
          .query({ format: 'json' });

        expect(response.status).toBe(404);
        expect(response.body.errorCode).toBe('JOB_NOT_FOUND');
      });

      test('should return 409 when job not completed', async () => {
        mockProcessingAPI.getJobStatus.mockImplementation(() => {
          throw new Error('Job is not completed yet');
        });
        mockProcessingAPI.getJobResults.mockReturnValue([]);

        const response = await request(app)
          .get(`/api/export/${validJobId}`)
          .query({ format: 'json' });

        expect(response.status).toBe(409);
        expect(response.body.errorCode).toBe('JOB_NOT_COMPLETED');
      });
    });

    describe('Export Limits', () => {
      test('should return 413 when PDF export exceeds invoice limit', async () => {
        const mockResults = Array(600).fill({ success: true, data: {} });

        mockProcessingAPI.getJobStatus.mockReturnValue({
          progress: { total: 600, successful: 600, failed: 0 },
          results: mockResults
        });
        mockProcessingAPI.getJobResults.mockReturnValue(mockResults);
        transformResultsForExport.mockReturnValue(Array(600).fill({}));

        const response = await request(app)
          .get(`/api/export/${validJobId}`)
          .query({ format: 'pdf' });

        expect(response.status).toBe(413);
        expect(response.body.errorCode).toBe('LIMIT_EXCEEDED');
        expect(response.body.details.maxAllowed).toBe(500);
        expect(response.body.details.currentCount).toBe(600);
      });

      test('should return 413 when record count exceeds general limit', async () => {
        const mockResults = Array(6000).fill({ success: true, data: {} });

        mockProcessingAPI.getJobStatus.mockReturnValue({
          progress: { total: 6000, successful: 6000, failed: 0 },
          results: mockResults
        });
        mockProcessingAPI.getJobResults.mockReturnValue(mockResults);
        transformResultsForExport.mockReturnValue(Array(6000).fill({}));

        const response = await request(app)
          .get(`/api/export/${validJobId}`)
          .query({ format: 'csv' });

        expect(response.status).toBe(413);
        expect(response.body.errorCode).toBe('LIMIT_EXCEEDED');
        expect(response.body.details.maxAllowed).toBe(5000);
        expect(response.body.details.currentCount).toBe(6000);
      });

      test('should add warning header when approaching limits', async () => {
        const mockResults = Array(4500).fill({ success: true, data: {} });

        mockProcessingAPI.getJobStatus.mockReturnValue({
          progress: { total: 4500, successful: 4500, failed: 0 },
          results: mockResults
        });
        mockProcessingAPI.getJobResults.mockReturnValue(mockResults);
        transformResultsForExport.mockReturnValue(Array(4500).fill({}));

        const response = await request(app)
          .get(`/api/export/${validJobId}`)
          .query({ format: 'json' });

        expect(response.status).toBe(200);
        expect(response.headers['x-export-limit-warning']).toBe('Approaching export limit: 4500/5000 records');
      });
    });

    describe('Format Handling', () => {
      const mockResults = [
        { success: true, data: { orderNumber: '123', total: 100 } }
      ];
      const mockJobStatus = {
        progress: { total: 1, successful: 1, failed: 0 },
        results: mockResults
      };
      const transformedResults = [
        {
          filename: 'test.pdf',
          orderNumber: '123',
          total: 100,
          items: [],
          validationStatus: 'valid'
        }
      ];

      beforeEach(() => {
        mockProcessingAPI.getJobStatus.mockReturnValue(mockJobStatus);
        mockProcessingAPI.getJobResults.mockReturnValue(mockResults);
        transformResultsForExport.mockReturnValue(transformedResults);
      });

      test('should export JSON format successfully', async () => {
        const response = await request(app)
          .get(`/api/export/${validJobId}`)
          .query({ format: 'json' });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
        expect(response.headers['content-disposition']).toContain('invoice-results-job_123-');

        const data = JSON.parse(response.text);
        expect(data.jobId).toBe(validJobId);
        expect(data.results).toEqual(transformedResults);
      });

      test('should export CSV format successfully', async () => {
        let csvData = '';
        const response = await request(app)
          .get(`/api/export/${validJobId}`)
          .query({ format: 'csv' })
          .buffer(true)
          .parse((res, callback) => {
            res.on('data', chunk => csvData += chunk.toString());
            res.on('end', () => callback(null, csvData));
          });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('text/csv');
        expect(response.headers['content-disposition']).toContain('invoice-results-job_123.csv');
        expect(csvData).toContain('Filename');
        expect(csvData).toContain('Order Number');
      });

      test('should export PDF format successfully', async () => {
        const mockPDFGenerator = {
          generateReport: jest.fn().mockResolvedValue(Buffer.from('pdf content'))
        };
        PDFReportGenerator.mockImplementation(() => mockPDFGenerator);

        const response = await request(app)
          .get(`/api/export/${validJobId}`)
          .query({ format: 'pdf', template: 'detailed' });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.headers['content-disposition']).toContain('invoice-results-job_123-');
        expect(mockPDFGenerator.generateReport).toHaveBeenCalledWith(
          transformedResults,
          validJobId,
          expect.any(Object), // summary
          expect.any(Array),  // errors
          'detailed'
        );
      });

      test('should use default template for PDF when not specified', async () => {
        const mockPDFGenerator = {
          generateReport: jest.fn().mockResolvedValue(Buffer.from('pdf content'))
        };
        PDFReportGenerator.mockImplementation(() => mockPDFGenerator);

        await request(app)
          .get(`/api/export/${validJobId}`)
          .query({ format: 'pdf' });

        expect(mockPDFGenerator.generateReport).toHaveBeenCalledWith(
          expect.any(Array),
          expect.any(String),
          expect.any(Object),
          expect.any(Array),
          'detailed' // default template
        );
      });
    });


    describe('Error Handling', () => {
      test('should handle unexpected errors gracefully', async () => {
        mockProcessingAPI.getJobStatus.mockImplementation(() => {
          throw new Error('Unexpected database error');
        });
        mockProcessingAPI.getJobResults.mockReturnValue([]);

        // Mock console.error to avoid test output pollution
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const response = await request(app)
          .get(`/api/export/${validJobId}`)
          .query({ format: 'json' });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Export failed');
        expect(response.body.errorCode).toBe('EXPORT_ERROR');
        expect(response.body.message).toBe('An error occurred while generating the export. Please try again or contact support.');

        // Verify error was logged
        expect(consoleSpy).toHaveBeenCalledWith('Export error:', expect.objectContaining({
          jobId: validJobId,
          format: 'json',
          error: 'Unexpected database error'
        }));

        consoleSpy.mockRestore();
      });

      test('should return 404 when no results found', async () => {
        mockProcessingAPI.getJobStatus.mockReturnValue({
          progress: { total: 1, successful: 1, failed: 0 },
          results: []
        });
        mockProcessingAPI.getJobResults.mockReturnValue([]);
        transformResultsForExport.mockReturnValue([]);

        const response = await request(app)
          .get(`/api/export/${validJobId}`)
          .query({ format: 'json' });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('No results found');
        expect(response.body.message).toBe('No processing results available for this job');
      });
    });
  });

  describe('Filename Sanitization', () => {
    test('should sanitize job ID in filename', async () => {
      // Create Express app for this test
      const app = express();
      app.use(express.json());

      // Create mock ProcessingAPI
      const mockProcessingAPI = {
        getJobStatus: jest.fn(),
        getJobResults: jest.fn()
      };

      // Apply export routes with mock API
      exportRoutes(app, mockProcessingAPI);

      const maliciousJobId = 'job_123<script>alert("xss")</script>';
      const mockResults = [{ success: true, data: {} }];
      const mockJobStatus = {
        progress: { total: 1, successful: 1, failed: 0 },
        results: mockResults
      };
      const transformedResults = [{
        filename: 'test.pdf',
        orderNumber: '123',
        total: 100,
        items: [],
        validationStatus: 'valid'
      }];

      // Setup mocks specifically for this test
      mockProcessingAPI.getJobStatus.mockReturnValue(mockJobStatus);
      mockProcessingAPI.getJobResults.mockReturnValue(mockResults);
      transformResultsForExport.mockReturnValue(transformedResults);

      const response = await request(app)
        .get(`/api/export/${encodeURIComponent(maliciousJobId)}`)
        .query({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toContain('invoice-results-job_123scriptalertxssscript-');
      expect(response.headers['content-disposition']).not.toContain('<script>');
    });
  });
});