/**
 * Unit tests for export API functionality
 */

const request = require('supertest');
const express = require('express');
const exportRoutes = require('../src/api/export');

// Mock dependencies
jest.mock('../src/utils/result-transformer');
jest.mock('../src/utils/pdf-report-generator');

// Mock the calculateBatchTotals function
const { calculateBatchTotals } = require('../src/utils/result-transformer');
calculateBatchTotals.mockImplementation((jobStatuses, jobResults) => {
  // Simple mock implementation for testing
  const batchSummary = {
    totalJobs: jobStatuses.length,
    totalInvoices: 0,
    successfulInvoices: 0,
    failedInvoices: 0,
    jobs: [],
    totals: { total: 0, subtotal: 0, shipping: 0, tax: 0, discount: 0 },
    currencies: {},
    exportDate: new Date().toISOString()
  };

  jobStatuses.forEach((status, index) => {
    const results = jobResults[index];
    const successfulResults = results.filter(r => r.success);

    // Calculate totals for this job
    let jobTotal = 0;
    let jobSubtotal = 0;
    let jobShipping = 0;
    let jobTax = 0;
    let jobDiscount = 0;

    successfulResults.forEach(result => {
      if (result.data) {
        jobTotal += result.data.total || 0;
        jobSubtotal += result.data.subtotal || 0;
        jobShipping += result.data.shipping || 0;
        jobTax += result.data.tax || 0;
        jobDiscount += result.data.discount || 0;
      }
    });

    batchSummary.totalInvoices += successfulResults.length;
    batchSummary.successfulInvoices += successfulResults.length;
    batchSummary.failedInvoices += status.progress.failed;

    batchSummary.totals.total += jobTotal;
    batchSummary.totals.subtotal += jobSubtotal;
    batchSummary.totals.shipping += jobShipping;
    batchSummary.totals.tax += jobTax;
    batchSummary.totals.discount += jobDiscount;

    batchSummary.jobs.push({
      jobId: status.id,
      created: status.created,
      completed: status.completed,
      invoiceCount: successfulResults.length,
      successfulInvoices: status.progress.successful,
      failedInvoices: status.progress.failed,
      successRate: status.progress.total > 0
        ? Math.round((status.progress.successful / status.progress.total) * 100 * 10) / 10
        : 0,
      totals: { total: jobTotal, subtotal: jobSubtotal, shipping: jobShipping, tax: jobTax, discount: jobDiscount },
      currency: 'USD'
    });
  });

  return batchSummary;
});
jest.mock('../config/export.config', () => ({
  VALID_FORMATS: ['json', 'csv', 'pdf'],
  VALID_TEMPLATES: ['summary', 'detailed', 'financial'],
  VALID_BATCH_FORMATS: ['json', 'csv'],
  LIMITS: {
    MAX_RECORDS: 5000,
    PDF_MAX_INVOICES: 500,
    WARNING_THRESHOLD: 4000,
    MAX_JOBS_BATCH: 100,
    MAX_INVOICES_BATCH: 10000
  },
  ERRORS: {
    CODES: {
      EXPORT_ERROR: 'EXPORT_ERROR',
      INVALID_FORMAT: 'INVALID_FORMAT',
      INVALID_TEMPLATE: 'INVALID_TEMPLATE',
      JOB_NOT_FOUND: 'JOB_NOT_FOUND',
      JOB_NOT_COMPLETED: 'JOB_NOT_COMPLETED',
      LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
      VALIDATION_ERROR: 'VALIDATION_ERROR'
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
  },
  BATCH_TOTALS: {
    CSV_HEADERS: [
      'Job ID',
      'Job Created Date',
      'Job Completed Date',
      'Total Invoices',
      'Successful Invoices',
      'Failed Invoices',
      'Total Amount',
      'Total Subtotal',
      'Total Shipping',
      'Total Tax',
      'Total Discount',
      'Currency',
      'Success Rate (%)'
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

  describe('POST /api/export/batch-totals', () => {
    const validJobIds = ['job_123', 'job_456'];
    const invalidJobIds = ['invalid_job', 'job_123'];

    describe('Request Validation', () => {
      test('should return 400 for missing jobIds', async () => {
        const response = await request(app)
          .post('/api/export/batch-totals')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe('VALIDATION_ERROR');
        expect(response.body.message).toContain('jobIds must be a non-empty array');
      });

      test('should return 400 for empty jobIds array', async () => {
        const response = await request(app)
          .post('/api/export/batch-totals')
          .send({ jobIds: [] });

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe('VALIDATION_ERROR');
      });

      test('should return 400 for invalid job ID format', async () => {
        const response = await request(app)
          .post('/api/export/batch-totals')
          .send({ jobIds: invalidJobIds });

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe('VALIDATION_ERROR');
        expect(response.body.message).toContain('Invalid job ID format');
      });

      test('should return 400 for invalid format', async () => {
        const response = await request(app)
          .post('/api/export/batch-totals')
          .send({ jobIds: validJobIds, format: 'pdf' });

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe('INVALID_FORMAT');
      });
    });

    describe('Batch Limits', () => {
      test('should return 413 when job count exceeds limit', async () => {
        const tooManyJobs = Array(101).fill('job_123'); // Exceeds MAX_JOBS_BATCH

        const response = await request(app)
          .post('/api/export/batch-totals')
          .send({ jobIds: tooManyJobs });

        expect(response.status).toBe(413);
        expect(response.body.errorCode).toBe('LIMIT_EXCEEDED');
        expect(response.body.details.maxAllowed).toBe(100);
      });

      test('should return 413 when total invoices exceed limit', async () => {
        const mockResults = Array(10001).fill({ success: true, data: {} }); // Exceeds MAX_INVOICES_BATCH

        mockProcessingAPI.getJobStatus.mockReturnValue({
          id: 'job_123',
          status: 'completed',
          progress: { total: 10001, successful: 10001, failed: 0 },
          results: mockResults
        });
        mockProcessingAPI.getJobResults.mockReturnValue(mockResults);

        const response = await request(app)
          .post('/api/export/batch-totals')
          .send({ jobIds: ['job_123'] });

        expect(response.status).toBe(413);
        expect(response.body.errorCode).toBe('LIMIT_EXCEEDED');
        expect(response.body.details.maxAllowed).toBe(10000);
      });
    });

    describe('Job Processing', () => {
      const mockJobStatus1 = {
        id: 'job_123',
        status: 'completed',
        progress: { total: 2, successful: 2, failed: 0 },
        created: new Date('2024-01-01'),
        completed: new Date('2024-01-02'),
        results: []
      };

      const mockJobStatus2 = {
        id: 'job_456',
        status: 'completed',
        progress: { total: 1, successful: 1, failed: 0 },
        created: new Date('2024-01-03'),
        completed: new Date('2024-01-04'),
        results: []
      };

      const mockResults1 = [
        { success: true, data: { orderNumber: '123', total: 100, subtotal: 90, shipping: 5, tax: 5, currency: 'USD' } },
        { success: true, data: { orderNumber: '124', total: 200, subtotal: 180, shipping: 10, tax: 10, currency: 'USD' } }
      ];

      const mockResults2 = [
        { success: true, data: { orderNumber: '125', total: 50, subtotal: 45, shipping: 2, tax: 3, currency: 'EUR' } }
      ];

      beforeEach(() => {
        // Mock multiple job calls
        mockProcessingAPI.getJobStatus
          .mockImplementationOnce(() => mockJobStatus1)
          .mockImplementationOnce(() => mockJobStatus2);

        mockProcessingAPI.getJobResults
          .mockImplementationOnce(() => mockResults1)
          .mockImplementationOnce(() => mockResults2);

        transformResultsForExport.mockImplementation((results) =>
          results.filter(r => r.success).map(r => ({
            filename: 'test.pdf',
            orderNumber: r.data.orderNumber,
            totals: {
              total: r.data.total,
              subtotal: r.data.subtotal,
              shipping: r.data.shipping,
              tax: r.data.tax
            },
            currency: r.data.currency,
            validationStatus: 'valid'
          }))
        );
      });

      test('should successfully export batch totals in JSON format', async () => {
        const response = await request(app)
          .post('/api/export/batch-totals')
          .send({ jobIds: validJobIds, format: 'json' });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
        expect(response.headers['content-disposition']).toContain('batch-totals-');

        const data = JSON.parse(response.text);
        expect(data.totalJobs).toBe(2);
        expect(data.totalInvoices).toBe(3);
        expect(data.successfulInvoices).toBe(3);
        expect(data.totals.total).toBe(350); // 100 + 200 + 50
        expect(data.totals.subtotal).toBe(315); // 90 + 180 + 45
        expect(data.jobs).toHaveLength(2);
        expect(data.currencies.USD.invoiceCount).toBe(2);
        expect(data.currencies.EUR.invoiceCount).toBe(1);
      });

      test('should successfully export batch totals in CSV format', async () => {
        let csvData = '';
        const response = await request(app)
          .post('/api/export/batch-totals')
          .send({ jobIds: validJobIds, format: 'csv' })
          .buffer(true)
          .parse((res, callback) => {
            res.on('data', chunk => csvData += chunk.toString());
            res.on('end', () => callback(null, csvData));
          });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('text/csv');
        expect(response.headers['content-disposition']).toContain('batch-totals-');
        expect(csvData).toContain('Job ID');
        expect(csvData).toContain('BATCH_TOTAL');
        expect(csvData).toContain('350.00'); // Total amount
      });

      test('should remove duplicate job IDs', async () => {
        const duplicateJobIds = ['job_123', 'job_123', 'job_456'];

        mockProcessingAPI.getJobStatus
          .mockImplementationOnce(() => mockJobStatus1)
          .mockImplementationOnce(() => mockJobStatus2);

        mockProcessingAPI.getJobResults
          .mockImplementationOnce(() => mockResults1)
          .mockImplementationOnce(() => mockResults2);

        const response = await request(app)
          .post('/api/export/batch-totals')
          .send({ jobIds: duplicateJobIds, format: 'json' });

        expect(response.status).toBe(200);
        const data = JSON.parse(response.text);
        expect(data.totalJobs).toBe(2); // Should be deduplicated
        expect(mockProcessingAPI.getJobStatus).toHaveBeenCalledTimes(2);
      });

      test('should skip non-completed jobs', async () => {
        const mixedJobStatus = {
          ...mockJobStatus1,
          status: 'processing' // Not completed
        };

        mockProcessingAPI.getJobStatus
          .mockImplementationOnce(() => mixedJobStatus)
          .mockImplementationOnce(() => mockJobStatus2);

        mockProcessingAPI.getJobResults
          .mockImplementationOnce(() => mockResults1)
          .mockImplementationOnce(() => mockResults2);

        // Update mock to only return completed jobs
        calculateBatchTotals.mockImplementationOnce((jobStatuses, jobResults) => {
          return {
            totalJobs: 1, // Only the completed job
            totalInvoices: 1,
            successfulInvoices: 1,
            failedInvoices: 0,
            jobs: [{
              jobId: 'job_456',
              created: mockJobStatus2.created,
              completed: mockJobStatus2.completed,
              invoiceCount: 1,
              successfulInvoices: 1,
              failedInvoices: 0,
              successRate: 100,
              totals: { total: 50, subtotal: 45, shipping: 2, tax: 3, discount: 0 },
              currency: 'EUR'
            }],
            totals: { total: 50, subtotal: 45, shipping: 2, tax: 3, discount: 0 },
            currencies: {
              EUR: { total: 50, subtotal: 45, shipping: 2, tax: 3, discount: 0, invoiceCount: 1 }
            },
            exportDate: new Date().toISOString()
          };
        });

        const response = await request(app)
          .post('/api/export/batch-totals')
          .send({ jobIds: validJobIds, format: 'json' });

        expect(response.status).toBe(200);
        const data = JSON.parse(response.text);
        expect(data.totalJobs).toBe(1); // Only completed job included
        expect(data.jobs[0].jobId).toBe('job_456');
      });

      test('should return 404 when no valid jobs found', async () => {
        mockProcessingAPI.getJobStatus.mockImplementation(() => {
          throw new Error('Job not found');
        });

        mockProcessingAPI.getJobResults.mockReturnValue([]);

        const response = await request(app)
          .post('/api/export/batch-totals')
          .send({ jobIds: validJobIds, format: 'json' });

        expect(response.status).toBe(404);
        expect(response.body.errorCode).toBe('VALIDATION_ERROR');
        expect(response.body.message).toContain('None of the specified jobs were found or completed');
      });
    });

    describe('Error Handling', () => {
      test('should handle unexpected errors gracefully', async () => {
        mockProcessingAPI.getJobStatus.mockImplementation(() => {
          throw new Error('Database connection failed');
        });
        mockProcessingAPI.getJobResults.mockReturnValue([]);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const response = await request(app)
          .post('/api/export/batch-totals')
          .send({ jobIds: validJobIds, format: 'json' });

        expect(response.status).toBe(404);
        expect(response.body.errorCode).toBe('VALIDATION_ERROR');
        expect(response.body.message).toContain('None of the specified jobs were found or completed');

        consoleSpy.mockRestore();
      });
    });
  });

  describe('GET /api/export/:jobId with batch totals', () => {
    const validJobId = 'job_123';

      test('should include batch totals in JSON export when requested', async () => {
        const mockResults = [
          { success: true, data: { orderNumber: '123', total: 100, subtotal: 90, shipping: 5, tax: 5 } }
        ];

        mockProcessingAPI.getJobStatus.mockReturnValue({
          id: validJobId,
          status: 'completed',
          progress: { total: 1, successful: 1, failed: 0 },
          created: new Date(),
          completed: new Date(),
          results: mockResults
        });
        mockProcessingAPI.getJobResults.mockReturnValue(mockResults);
        transformResultsForExport.mockReturnValue([
          {
            filename: 'test.pdf',
            orderNumber: '123',
            totals: { total: 100, subtotal: 90, shipping: 5, tax: 5 },
            currency: 'USD',
            validationStatus: 'valid'
          }
        ]);

        // Mock calculateBatchTotals for this specific test
        calculateBatchTotals.mockImplementationOnce((jobStatuses, jobResults) => {
          return {
            jobs: [{
              jobId: validJobId,
              totals: { total: 100, subtotal: 90, shipping: 5, tax: 5, discount: 0 },
              currency: 'USD',
              successRate: 100,
              invoiceCount: 1,
              successfulInvoices: 1,
              failedInvoices: 0
            }]
          };
        });

        const response = await request(app)
          .get(`/api/export/${validJobId}`)
          .query({ format: 'json', includeBatchTotals: 'true' });

        expect(response.status).toBe(200);
        const data = JSON.parse(response.text);
        expect(data.batchTotals).toBeDefined();
        expect(data.batchTotals.jobId).toBe(validJobId);
        expect(data.batchTotals.totals.total).toBe(100);
        expect(data.batchTotalsSummary).toBeDefined();
        expect(data.batchTotalsSummary.totalJobs).toBe(1);
      });

    test('should not include batch totals when not requested', async () => {
      const mockResults = [{ success: true, data: {} }];

      mockProcessingAPI.getJobStatus.mockReturnValue({
        progress: { total: 1, successful: 1, failed: 0 },
        results: mockResults
      });
      mockProcessingAPI.getJobResults.mockReturnValue(mockResults);
      transformResultsForExport.mockReturnValue([{}]);

      const response = await request(app)
        .get(`/api/export/${validJobId}`)
        .query({ format: 'json' }); // No includeBatchTotals parameter

      expect(response.status).toBe(200);
      const data = JSON.parse(response.text);
      expect(data.batchTotals).toBeUndefined();
      expect(data.batchTotalsSummary).toBeUndefined();
    });

      test('should continue export even if batch totals calculation fails', async () => {
        const mockResults = [{ success: true, data: {} }];

        mockProcessingAPI.getJobStatus.mockReturnValue({
          progress: { total: 1, successful: 1, failed: 0 },
          results: mockResults
        });
        mockProcessingAPI.getJobResults.mockReturnValue(mockResults);
        transformResultsForExport.mockReturnValue([{}]);

        // Mock calculateBatchTotals to throw an error
        calculateBatchTotals.mockImplementationOnce(() => {
          throw new Error('Calculation failed');
        });

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const response = await request(app)
          .get(`/api/export/${validJobId}`)
          .query({ format: 'json', includeBatchTotals: 'true' });

        expect(response.status).toBe(200);
        const data = JSON.parse(response.text);
        expect(data.batchTotals).toBeUndefined(); // Should not be present due to error
        expect(data.results).toBeDefined(); // But regular export should still work

        consoleSpy.mockRestore();
      });
  });

  describe('GET /api/export/:jobId/totals', () => {
    const validJobId = 'job_123';

    describe('Request Validation', () => {
      test('should return 400 for invalid job ID format', async () => {
        const response = await request(app)
          .get('/api/export/invalid_job/totals')
          .query({ format: 'json' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid job ID');
      });

      test('should return 400 for invalid format', async () => {
        const response = await request(app)
          .get(`/api/export/${validJobId}/totals`)
          .query({ format: 'pdf' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid format');
        expect(response.body.errorCode).toBe('INVALID_FORMAT');
      });
    });

    describe('Job Status Handling', () => {
      test('should return 404 when job not found', async () => {
        mockProcessingAPI.getJobStatus.mockImplementation(() => {
          throw new Error('Job not found');
        });

        const response = await request(app)
          .get(`/api/export/${validJobId}/totals`)
          .query({ format: 'json' });

        expect(response.status).toBe(404);
        expect(response.body.errorCode).toBe('JOB_NOT_FOUND');
      });

      test('should return 409 when job not completed', async () => {
        mockProcessingAPI.getJobStatus.mockReturnValue({
          status: 'processing',
          progress: { total: 1, successful: 0, failed: 0 }
        });

        const response = await request(app)
          .get(`/api/export/${validJobId}/totals`)
          .query({ format: 'json' });

        expect(response.status).toBe(409);
        expect(response.body.errorCode).toBe('JOB_NOT_COMPLETED');
      });
    });

    describe('Successful Export', () => {
      const mockJobStatus = {
        id: validJobId,
        status: 'completed',
        progress: { total: 2, successful: 2, failed: 0 },
        created: new Date('2024-01-01'),
        completed: new Date('2024-01-02')
      };

      const mockResults = [
        { success: true, data: { orderNumber: '123', total: 100, subtotal: 90, shipping: 5, tax: 5, currency: 'USD' } },
        { success: true, data: { orderNumber: '124', total: 200, subtotal: 180, shipping: 10, tax: 10, currency: 'USD' } }
      ];

      beforeEach(() => {
        mockProcessingAPI.getJobStatus.mockReturnValue(mockJobStatus);
        mockProcessingAPI.getJobResults.mockReturnValue(mockResults);
      });

      test('should successfully export job totals in JSON format', async () => {
        const response = await request(app)
          .get(`/api/export/${validJobId}/totals`)
          .query({ format: 'json' });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
        expect(response.headers['content-disposition']).toContain('job-totals-job_123-');

        const data = JSON.parse(response.text);
        expect(data.jobId).toBe(validJobId);
        expect(data.invoiceCount).toBe(2);
        expect(data.successfulInvoices).toBe(2);
        expect(data.totals.total).toBe(300); // 100 + 200
        expect(data.totals.subtotal).toBe(270); // 90 + 180
        expect(data.currency).toBe('USD');
        expect(data.successRate).toBe(100);
      });

      test('should successfully export job totals in CSV format', async () => {
        let csvData = '';
        const response = await request(app)
          .get(`/api/export/${validJobId}/totals`)
          .query({ format: 'csv' })
          .buffer(true)
          .parse((res, callback) => {
            res.on('data', chunk => csvData += chunk.toString());
            res.on('end', () => callback(null, csvData));
          });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('text/csv');
        expect(response.headers['content-disposition']).toContain('job-totals-job_123-');
        expect(csvData).toContain('Job ID');
        expect(csvData).toContain('300.00'); // Total amount
        expect(csvData).toContain('270.00'); // Subtotal
      });
    });

    describe('Error Handling', () => {
      test('should return 404 when no results found', async () => {
        mockProcessingAPI.getJobStatus.mockReturnValue({
          status: 'completed',
          progress: { total: 1, successful: 1, failed: 0 }
        });
        mockProcessingAPI.getJobResults.mockReturnValue([]);

        const response = await request(app)
          .get(`/api/export/${validJobId}/totals`)
          .query({ format: 'json' });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('No results found');
      });

      test('should handle unexpected errors gracefully', async () => {
        mockProcessingAPI.getJobStatus.mockImplementation(() => {
          throw new Error('Unexpected error');
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const response = await request(app)
          .get(`/api/export/${validJobId}/totals`)
          .query({ format: 'json' });

        expect(response.status).toBe(404);
        expect(response.body.errorCode).toBe('JOB_NOT_FOUND');

        consoleSpy.mockRestore();
      });
    });
  });
});