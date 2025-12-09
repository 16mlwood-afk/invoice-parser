/**
 * Unit tests for batch totals export functionality
 * Extracted from export.test.js to provide dedicated test coverage
 */

const request = require('supertest');
const express = require('express');
const exportRoutes = require('../../src/api/export');

// Mock dependencies
jest.mock('../../src/utils/result-transformer');
jest.mock('../../src/utils/pdf-report-generator');

// Mock the calculateBatchTotals function
const { calculateBatchTotals } = require('../../src/utils/result-transformer');
const { transformResultsForExport } = require('../../src/utils/result-transformer');

// Mock config
jest.mock('../../config/export.config', () => ({
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
      JOB_NOT_COMPLETED: 'Job is not completed yet',
      LIMIT_EXCEEDED: 'Export limit exceeded',
      NO_RESULTS: 'No results found for export',
      EXPORT_FAILED: 'An error occurred while generating the export. Please try again or contact support.'
    }
  },
  FILENAME: {
    PREFIX: 'invoice-results',
    SANITIZE_PATTERN: /[^a-zA-Z0-9\-_.]/g,
    SANITIZE_REPLACEMENT: '-'
  },
  CSV: {
    HEADERS: [
      'Filename',
      'Order Number',
      'Invoice Date',
      'Total Amount',
      'Subtotal',
      'Shipping',
      'Tax',
      'Discount',
      'Currency',
      'Processing Status'
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

// Mock implementation for calculateBatchTotals
calculateBatchTotals.mockReturnValue({
  totalJobs: 2,
  totalInvoices: 3,
  successfulInvoices: 3,
  failedInvoices: 0,
  jobs: [
    {
      jobId: 'job_123',
      created: new Date('2024-01-01'),
      completed: new Date('2024-01-02'),
      invoiceCount: 2,
      successfulInvoices: 2,
      failedInvoices: 0,
      successRate: 100.0,
      totals: { total: 300, subtotal: 270, shipping: 15, tax: 15, discount: 0 },
      currency: 'USD'
    },
    {
      jobId: 'job_456',
      created: new Date('2024-01-03'),
      completed: new Date('2024-01-04'),
      invoiceCount: 1,
      successfulInvoices: 1,
      failedInvoices: 0,
      successRate: 100.0,
      totals: { total: 50, subtotal: 45, shipping: 2, tax: 3, discount: 0 },
      currency: 'EUR'
    }
  ],
  totals: { total: 350, subtotal: 315, shipping: 17, tax: 18, discount: 0 },
  currencies: {
    USD: { total: 300, subtotal: 270, shipping: 15, tax: 15, discount: 0, invoiceCount: 2 },
    EUR: { total: 50, subtotal: 45, shipping: 2, tax: 3, discount: 0, invoiceCount: 1 }
  },
  exportDate: new Date().toISOString()
});

describe('Batch Totals Export API', () => {
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
        expect(response.body.message).toContain('jobIds must be a non-empty array');
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

      test('should return 404 when no valid jobs found', async () => {
        // Clear the mocks set up by beforeEach and set up error mocks
        jest.clearAllMocks();

        // Re-create mock functions after clearing
        mockProcessingAPI.getJobStatus = jest.fn().mockImplementation(() => {
          throw new Error('Job not found');
        });
        mockProcessingAPI.getJobResults = jest.fn().mockReturnValue([]);

        const response = await request(app)
          .post('/api/export/batch-totals')
          .send({ jobIds: validJobIds, format: 'json' });

        expect(response.status).toBe(404);
        expect(response.body.errorCode).toBe('VALIDATION_ERROR');
        expect(response.body.message).toContain('None of the specified jobs were found or completed');
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
        const response = await request(app)
          .post('/api/export/batch-totals')
          .send({ jobIds: validJobIds, format: 'csv' });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
        expect(response.headers['content-disposition']).toContain('batch-totals-');
        expect(response.text).toContain('Job ID');
        expect(response.text).toContain('job_123');
        expect(response.text).toContain('job_456');
        expect(response.text).toContain('BATCH_TOTAL');
      });

      test('should remove duplicate job IDs', async () => {
        const duplicateJobIds = ['job_123', 'job_456', 'job_123'];

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
    });

    describe('Error Handling', () => {
      test('should handle unexpected errors gracefully', async () => {
        mockProcessingAPI.getJobStatus.mockImplementation(() => {
          throw new Error('Database connection failed');
        });
        mockProcessingAPI.getJobResults.mockReturnValue([]);

        // Mock console.error to avoid test output pollution
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

    beforeEach(() => {
      const mockResults = [
        { success: true, data: { orderNumber: '123', total: 100, subtotal: 90, shipping: 5, tax: 5, currency: 'USD' } }
      ];
      const mockJobStatus = {
        progress: { total: 1, successful: 1, failed: 0 },
        results: mockResults
      };

      mockProcessingAPI.getJobStatus.mockReturnValue(mockJobStatus);
      mockProcessingAPI.getJobResults.mockReturnValue(mockResults);
      transformResultsForExport.mockReturnValue([{
        filename: 'test.pdf',
        orderNumber: '123',
        totals: { total: 100, subtotal: 90, shipping: 5, tax: 5 },
        currency: 'USD',
        validationStatus: 'valid'
      }]);
    });

    test('should include batch totals in JSON export when requested', async () => {
      // Temporarily override the mock to return correct data for single job
      calculateBatchTotals.mockReturnValueOnce({
        totalJobs: 1,
        totalInvoices: 1,
        successfulInvoices: 1,
        failedInvoices: 0,
        jobs: [{
          jobId: validJobId,
          created: new Date(),
          completed: new Date(),
          invoiceCount: 1,
          successfulInvoices: 1,
          failedInvoices: 0,
          successRate: 100.0,
          totals: { total: 100, subtotal: 90, shipping: 5, tax: 5, discount: 0 },
          currency: 'USD'
        }],
        totals: { total: 100, subtotal: 90, shipping: 5, tax: 5, discount: 0 },
        currencies: {
          USD: { total: 100, subtotal: 90, shipping: 5, tax: 5, discount: 0, invoiceCount: 1 }
        },
        exportDate: new Date().toISOString()
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
      expect(data.batchTotalsSummary.totalInvoices).toBe(1);
      expect(data.batchTotalsSummary.totals.total).toBe(100);
      expect(data.batchTotalsSummary.currencies.USD.invoiceCount).toBe(1);
    });

    test('should not include batch totals when not requested', async () => {
      const response = await request(app)
        .get(`/api/export/${validJobId}`)
        .query({ format: 'json' });

      expect(response.status).toBe(200);
      const data = JSON.parse(response.text);
      expect(data.batchTotals).toBeUndefined();
      expect(data.batchTotalsSummary).toBeUndefined();
    });

    test('should continue export even if batch totals calculation fails', async () => {
      // Make calculateBatchTotals throw an error
      calculateBatchTotals.mockImplementationOnce(() => {
        throw new Error('Batch totals calculation failed');
      });

      // Mock console.warn to avoid test output pollution
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await request(app)
        .get(`/api/export/${validJobId}`)
        .query({ format: 'json', includeBatchTotals: 'true' });

      expect(response.status).toBe(200);
      const data = JSON.parse(response.text);
      expect(data.results).toBeDefined(); // Regular export should still work
      expect(data.batchTotals).toBeUndefined(); // Should not be present due to error
      expect(data.batchTotalsSummary).toBeUndefined();

      consoleSpy.mockRestore();
    });
  });

  describe('GET /api/export/:jobId/totals', () => {
    const validJobId = 'job_123';
    const invalidJobId = 'invalid_job';

    describe('Request Validation', () => {
      test('should return 400 for invalid job ID format', async () => {
        const response = await request(app)
          .get(`/api/export/${invalidJobId}/totals`)
          .query({ format: 'json' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid job ID');
        expect(response.body.message).toBe('Job ID must be provided and start with "job_"');
      });

      test('should return 400 for invalid format', async () => {
        const response = await request(app)
          .get(`/api/export/${validJobId}/totals`)
          .query({ format: 'pdf' });

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe('INVALID_FORMAT');
        expect(response.body.message).toContain('Format must be one of: json, csv');
      });
    });

    describe('Job Status Handling', () => {
      test('should return 404 when job not found', async () => {
        mockProcessingAPI.getJobStatus.mockImplementation(() => {
          throw new Error('Job not found');
        });
        mockProcessingAPI.getJobResults.mockReturnValue([]);

        const response = await request(app)
          .get(`/api/export/${validJobId}/totals`)
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
          .get(`/api/export/${validJobId}/totals`)
          .query({ format: 'json' });

        expect(response.status).toBe(409);
        expect(response.body.errorCode).toBe('JOB_NOT_COMPLETED');
      });
    });

    describe('Successful Export', () => {
      beforeEach(() => {
        const mockResults = [
          { success: true, data: { orderNumber: '123', total: 100, subtotal: 90, shipping: 5, tax: 5, currency: 'USD' } },
          { success: true, data: { orderNumber: '124', total: 200, subtotal: 180, shipping: 10, tax: 10, currency: 'USD' } }
        ];
        const mockJobStatus = {
          id: validJobId,
          status: 'completed',
          progress: { total: 2, successful: 2, failed: 0 },
          created: new Date('2024-01-01'),
          completed: new Date('2024-01-02'),
          results: mockResults
        };

        mockProcessingAPI.getJobStatus.mockReturnValue(mockJobStatus);
        mockProcessingAPI.getJobResults.mockReturnValue(mockResults);
      });

      test('should successfully export job totals in JSON format', async () => {
        const response = await request(app)
          .get(`/api/export/${validJobId}/totals`)
          .query({ format: 'json' });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
        expect(response.headers['content-disposition']).toContain(`job-totals-${validJobId}-`);

        const data = JSON.parse(response.text);
        expect(data.jobId).toBe(validJobId);
        expect(data.invoiceCount).toBe(2);
        expect(data.successfulInvoices).toBe(2);
        expect(data.failedInvoices).toBe(0);
        expect(data.successRate).toBe(100);
        expect(data.totals.total).toBe(300);
        expect(data.totals.subtotal).toBe(270);
        expect(data.totals.shipping).toBe(15);
        expect(data.totals.tax).toBe(15);
        expect(data.currency).toBe('USD');
        expect(data.exportDate).toBeDefined();
      });

      test('should successfully export job totals in CSV format', async () => {
        const response = await request(app)
          .get(`/api/export/${validJobId}/totals`)
          .query({ format: 'csv' });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
        expect(response.headers['content-disposition']).toContain(`job-totals-${validJobId}-`);
        expect(response.text).toContain('Job ID');
        expect(response.text).toContain(validJobId);
        expect(response.text).toContain('300.00'); // Total amount
      });
    });

    describe('Error Handling', () => {
      test('should return 404 when no results found', async () => {
        const mockJobStatus = {
          id: validJobId,
          status: 'completed',
          progress: { total: 0, successful: 0, failed: 0 },
          created: new Date('2024-01-01'),
          completed: new Date('2024-01-02'),
          results: []
        };

        mockProcessingAPI.getJobStatus.mockReturnValue(mockJobStatus);
        mockProcessingAPI.getJobResults.mockReturnValue([]);

        const response = await request(app)
          .get(`/api/export/${validJobId}/totals`)
          .query({ format: 'json' });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('No results found');
        expect(response.body.message).toBe('No processing results available for this job');
      });

      test('should handle unexpected errors gracefully', async () => {
        mockProcessingAPI.getJobStatus.mockImplementation(() => {
          throw new Error('Unexpected database error');
        });
        mockProcessingAPI.getJobResults.mockReturnValue([]);

        // Mock console.error to avoid test output pollution
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const response = await request(app)
          .get(`/api/export/${validJobId}/totals`)
          .query({ format: 'json' });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Export failed');
        expect(response.body.errorCode).toBe('EXPORT_ERROR');
        expect(response.body.message).toBe('An error occurred while generating the export. Please try again or contact support.');

        consoleSpy.mockRestore();
      });
    });
  });
});