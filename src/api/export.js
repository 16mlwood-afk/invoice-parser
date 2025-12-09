// API endpoint for exporting job results in various formats
const ProcessingAPI = require('./processing');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { transformResultsForExport, calculateBatchTotals } = require('../utils/result-transformer');
const EXPORT_CONFIG = require('../../config/export.config');
const PDFReportGenerator = require('../utils/pdf-report-generator');
const { stringify } = require('csv-stringify');

module.exports = (app, testProcessingAPI = null) => {
  // Allow dependency injection for testing - prioritize testProcessingAPI
  const processingAPI = testProcessingAPI || new ProcessingAPI();
  // GET /api/export/:jobId?format=json|csv|pdf&template=summary|detailed|financial&includeBatchTotals=false - Export job results
  app.get('/api/export/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const { format = 'json', template = 'detailed', includeBatchTotals = 'false' } = req.query;


    try {
      // Validate jobId format
      if (!jobId || !jobId.startsWith('job_')) {
        return res.status(400).json({
          error: 'Invalid job ID',
          message: 'Job ID must be provided and start with "job_"'
        });
      }

      // Validate format
      if (!EXPORT_CONFIG.VALID_FORMATS.includes(format)) {
        return res.status(400).json({
          error: 'Invalid format',
          message: EXPORT_CONFIG.ERRORS.MESSAGES.INVALID_FORMAT,
          errorCode: EXPORT_CONFIG.ERRORS.CODES.INVALID_FORMAT
        });
      }

      // Validate template for PDF format
      if (format === 'pdf' && !EXPORT_CONFIG.VALID_TEMPLATES.includes(template)) {
        return res.status(400).json({
          error: 'Invalid template',
          message: EXPORT_CONFIG.ERRORS.MESSAGES.INVALID_TEMPLATE,
          errorCode: EXPORT_CONFIG.ERRORS.CODES.INVALID_TEMPLATE
        });
      }

      // Get job status first to check if job exists
      let jobStatus;
      try {
        jobStatus = processingAPI.getJobStatus(jobId);
      } catch (error) {
        // Handle job status errors
        if (error.message === 'Job not found') {
          return res.status(404).json({
            error: 'Job not found',
            message: EXPORT_CONFIG.ERRORS.MESSAGES.JOB_NOT_FOUND,
            errorCode: EXPORT_CONFIG.ERRORS.CODES.JOB_NOT_FOUND
          });
        }
        if (error.message === 'Job is not completed yet') {
          return res.status(409).json({
            error: 'Job not completed',
            message: EXPORT_CONFIG.ERRORS.MESSAGES.JOB_NOT_COMPLETED,
            errorCode: EXPORT_CONFIG.ERRORS.CODES.JOB_NOT_COMPLETED
          });
        }
        throw error; // Re-throw for general error handling
      }

      // Get results using the same logic as the results API
      const rawResults = processingAPI.getJobResults(jobId);

      if (!rawResults || rawResults.length === 0) {
        return res.status(404).json({
          error: 'No results found',
          message: 'No processing results available for this job'
        });
      }

      // Transform results to match frontend format
      const transformedResults = transformResultsForExport(rawResults);


      // Extract invoice data for PDF generation (include all transformed results)
      const invoices = transformedResults;

      if (transformedResults.length === 0) {
        return res.status(404).json({
          error: 'No results',
          message: EXPORT_CONFIG.ERRORS.MESSAGES.NO_RESULTS,
          errorCode: EXPORT_CONFIG.ERRORS.CODES.VALIDATION_ERROR
        });
      }

      // Validate export limits
      const recordCount = transformedResults.length;

      // Check format-specific limits
      if (format === 'pdf' && recordCount > EXPORT_CONFIG.LIMITS.PDF_MAX_INVOICES) {
        return res.status(413).json({
          error: 'Limit exceeded',
          message: `PDF export limited to ${EXPORT_CONFIG.LIMITS.PDF_MAX_INVOICES} invoices. Current count: ${recordCount}. Consider using CSV export or reducing dataset size.`,
          errorCode: EXPORT_CONFIG.ERRORS.CODES.LIMIT_EXCEEDED,
          details: {
            maxAllowed: EXPORT_CONFIG.LIMITS.PDF_MAX_INVOICES,
            currentCount: recordCount
          }
        });
      }

      if (recordCount > EXPORT_CONFIG.LIMITS.MAX_RECORDS) {
        return res.status(413).json({
          error: 'Limit exceeded',
          message: EXPORT_CONFIG.ERRORS.MESSAGES.LIMIT_EXCEEDED,
          errorCode: EXPORT_CONFIG.ERRORS.CODES.LIMIT_EXCEEDED,
          details: {
            maxAllowed: EXPORT_CONFIG.LIMITS.MAX_RECORDS,
            currentCount: recordCount
          }
        });
      }

      // Add warning headers if approaching limits
      if (recordCount >= EXPORT_CONFIG.LIMITS.WARNING_THRESHOLD) {
        res.setHeader('X-Export-Limit-Warning',
          `Approaching export limit: ${recordCount}/${EXPORT_CONFIG.LIMITS.MAX_RECORDS} records`);
      }

      // Build summary from job status
      const summary = {
        totalFiles: jobStatus.progress.total,
        processedFiles: jobStatus.progress.successful,
        failedFiles: jobStatus.progress.failed,
        successRate: jobStatus.progress.total > 0
          ? Math.round((jobStatus.progress.successful / jobStatus.progress.total) * 100)
          : 0
      };

      // Extract errors from raw results
      const errors = rawResults
        .filter(result => !result.success)
        .map(result => ({
          filename: result.filename,
          error: result.error || 'Processing failed',
          processedAt: result.processedAt
        }));

      // Generate filename with sanitization
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const sanitizedJobId = jobId.replace(EXPORT_CONFIG.FILENAME.SANITIZE_PATTERN, EXPORT_CONFIG.FILENAME.SANITIZE_REPLACEMENT);
      const filename = `${EXPORT_CONFIG.FILENAME.PREFIX}-${sanitizedJobId}-${timestamp}.${format}`;

      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      let content;
      let contentType;

      switch (format) {
        case 'json':
          // Return complete JSON structure matching CLI output
          const jsonResponse = {
            jobId: jobId,
            exportDate: new Date().toISOString(),
            summary: summary,
            results: transformedResults,
            errors: errors
          };

          // Optionally include batch totals summary if requested
          if (includeBatchTotals === 'true') {
            try {
              // Calculate totals for this single job
              const jobBatchTotals = calculateBatchTotals([jobStatus], [rawResults]);
              jsonResponse.batchTotals = jobBatchTotals.jobs[0]; // Single job summary
              jsonResponse.batchTotalsSummary = {
                totalJobs: 1,
                totalInvoices: jobBatchTotals.totalInvoices,
                totals: jobBatchTotals.totals,
                currencies: jobBatchTotals.currencies
              };
            } catch (error) {
              console.warn('Failed to calculate batch totals for job:', error.message);
              // Continue without batch totals rather than failing the entire export
            }
          }

          content = JSON.stringify(jsonResponse, null, 2);
          contentType = 'application/json';
          break;

        case 'csv':
          contentType = 'text/csv';

          // Set headers before streaming
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `attachment; filename="invoice-results-${jobId}.csv"`);

          const stringifier = stringify({
            header: true,
            columns: EXPORT_CONFIG.CSV.HEADERS
          });

          stringifier.pipe(res);

          transformedResults.forEach(result => {
            const baseData = {
              'Filename': result.filename || '',
              'Order Number': result.orderNumber || '',
              'Order Date': result.orderDate || '',
              'Customer Name': result.customerInfo?.name || '',
              'Customer Email': result.customerInfo?.email || '',
              'Item Description': '',
              'Item Quantity': '',
              'Item Unit Price': '',
              'Item Total': '',
              'Subtotal': result.totals?.subtotal || '',
              'Shipping': result.totals?.shipping || '',
              'Tax': result.totals?.tax || '',
              'Total': result.totals?.total || '',
              'Currency': result.currency || 'USD',
              'Validation Status': result.validationStatus === 'valid' ? 'valid' : 'warning',
              'Validation Errors': result.validationErrors?.join('; ') || '',
              'Processed At': ''
            };

            if (result.items && result.items.length > 0) {
              result.items.forEach(item => {
                stringifier.write({
                  ...baseData,
                  'Item Description': item.description || '',
                  'Item Quantity': item.quantity || '',
                  'Item Unit Price': item.unitPrice || '',
                  'Item Total': item.total || ''
                });
              });
            } else {
              stringifier.write(baseData);
            }
          });

          stringifier.end();
          return; // Important: exit early since response is handled by stream

        case 'pdf':
          // Generate enhanced PDF report
          const pdfGenerator = new PDFReportGenerator();
          content = await pdfGenerator.generateReport(transformedResults, jobId, summary, errors, template);
          contentType = 'application/pdf';
          break;

        default:
          return res.status(400).json({
            error: 'Unsupported format',
            message: `Format '${format}' is not supported`
          });
      }

      // Set content type and send response
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf8'));
      res.send(content);

    } catch (error) {
      // Log full error details server-side
      console.error('Export error:', {
        jobId,
        format,
        template,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      // Return safe error messages to client
      if (error.message === 'Job not found') {
        return res.status(404).json({
          error: 'Job not found',
          message: EXPORT_CONFIG.ERRORS.MESSAGES.JOB_NOT_FOUND,
          errorCode: EXPORT_CONFIG.ERRORS.CODES.JOB_NOT_FOUND
        });
      }

      if (error.message === 'Job is not completed yet') {
        return res.status(409).json({
          error: 'Job not completed',
          message: EXPORT_CONFIG.ERRORS.MESSAGES.JOB_NOT_COMPLETED,
          errorCode: EXPORT_CONFIG.ERRORS.CODES.JOB_NOT_COMPLETED
        });
      }

      // Generic error response
      res.status(500).json({
        error: 'Export failed',
        message: EXPORT_CONFIG.ERRORS.MESSAGES.EXPORT_FAILED,
        errorCode: EXPORT_CONFIG.ERRORS.CODES.EXPORT_ERROR
      });
    }
  });

  // GET /api/export/:jobId/totals?format=json|csv - Get summarized totals for a single job
  app.get('/api/export/:jobId/totals', async (req, res) => {
    const { jobId } = req.params;
    const { format = 'json' } = req.query;

    try {
      // Validate jobId format
      if (!jobId || !jobId.startsWith('job_')) {
        return res.status(400).json({
          error: 'Invalid job ID',
          message: 'Job ID must be provided and start with "job_"'
        });
      }

      // Validate format
      if (!EXPORT_CONFIG.VALID_BATCH_FORMATS.includes(format)) {
        return res.status(400).json({
          error: 'Invalid format',
          message: `Format must be one of: ${EXPORT_CONFIG.VALID_BATCH_FORMATS.join(', ')}`,
          errorCode: EXPORT_CONFIG.ERRORS.CODES.INVALID_FORMAT
        });
      }

      // Get job status first
      let jobStatus;
      try {
        jobStatus = processingAPI.getJobStatus(jobId);
      } catch (error) {
        return res.status(404).json({
          error: 'Job not found',
          message: EXPORT_CONFIG.ERRORS.MESSAGES.JOB_NOT_FOUND,
          errorCode: EXPORT_CONFIG.ERRORS.CODES.JOB_NOT_FOUND
        });
      }

      // Check if job is completed
      if (jobStatus.status !== 'completed') {
        return res.status(409).json({
          error: 'Job not completed',
          message: EXPORT_CONFIG.ERRORS.MESSAGES.JOB_NOT_COMPLETED,
          errorCode: EXPORT_CONFIG.ERRORS.CODES.JOB_NOT_COMPLETED
        });
      }

      // Get job results
      const rawResults = processingAPI.getJobResults(jobId);
      if (!rawResults || rawResults.length === 0) {
        return res.status(404).json({
          error: 'No results found',
          message: 'No processing results available for this job'
        });
      }

      // Calculate totals for this single job
      const jobTotals = calculateBatchTotals([jobStatus], [rawResults]);

      // Extract the single job summary (there should only be one)
      const jobSummary = jobTotals.jobs[0];
      const totalsSummary = {
        jobId: jobSummary.jobId,
        created: jobSummary.created,
        completed: jobSummary.completed,
        invoiceCount: jobSummary.invoiceCount,
        successfulInvoices: jobSummary.successfulInvoices,
        failedInvoices: jobSummary.failedInvoices,
        successRate: jobSummary.successRate,
        totals: jobSummary.totals,
        currency: jobSummary.currency,
        exportDate: new Date().toISOString()
      };

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const sanitizedJobId = jobId.replace(EXPORT_CONFIG.FILENAME.SANITIZE_PATTERN, EXPORT_CONFIG.FILENAME.SANITIZE_REPLACEMENT);
      const filename = `job-totals-${sanitizedJobId}-${timestamp}.${format}`;

      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      let content;
      let contentType;

      switch (format) {
        case 'json':
          content = JSON.stringify(totalsSummary, null, 2);
          contentType = 'application/json';
          break;

        case 'csv':
          contentType = 'text/csv';
          res.setHeader('Content-Type', contentType);

          const stringifier = stringify({
            header: true,
            columns: [
              'Job ID',
              'Created Date',
              'Completed Date',
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
          });

          stringifier.pipe(res);

          stringifier.write({
            'Job ID': totalsSummary.jobId,
            'Created Date': totalsSummary.created ? new Date(totalsSummary.created).toISOString().split('T')[0] : '',
            'Completed Date': totalsSummary.completed ? new Date(totalsSummary.completed).toISOString().split('T')[0] : '',
            'Total Invoices': totalsSummary.invoiceCount,
            'Successful Invoices': totalsSummary.successfulInvoices,
            'Failed Invoices': totalsSummary.failedInvoices,
            'Total Amount': totalsSummary.totals.total ? totalsSummary.totals.total.toFixed(2) : '0.00',
            'Total Subtotal': totalsSummary.totals.subtotal ? totalsSummary.totals.subtotal.toFixed(2) : '0.00',
            'Total Shipping': totalsSummary.totals.shipping ? totalsSummary.totals.shipping.toFixed(2) : '0.00',
            'Total Tax': totalsSummary.totals.tax ? totalsSummary.totals.tax.toFixed(2) : '0.00',
            'Total Discount': totalsSummary.totals.discount ? totalsSummary.totals.discount.toFixed(2) : '0.00',
            'Currency': totalsSummary.currency || '',
            'Success Rate (%)': totalsSummary.successRate
          });

          stringifier.end();
          return; // Important: exit early since response is handled by stream

        default:
          return res.status(400).json({
            error: 'Unsupported format',
            message: `Format '${format}' is not supported for job totals`
          });
      }

      // Set content type and send response
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf8'));
      res.send(content);

    } catch (error) {
      // Log full error details server-side
      console.error('Job totals export error:', {
        jobId,
        format,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      // Return safe error messages to client
      res.status(500).json({
        error: 'Job totals export failed',
        message: EXPORT_CONFIG.ERRORS.MESSAGES.EXPORT_FAILED,
        errorCode: EXPORT_CONFIG.ERRORS.CODES.EXPORT_ERROR
      });
    }
  });

  // POST /api/export/batch-totals - Get combined totals across multiple jobs
  app.post('/api/export/batch-totals', async (req, res) => {
    const { jobIds, format = 'json' } = req.body;

    try {
      // Validate request body
      if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'jobIds must be a non-empty array of job IDs',
          errorCode: EXPORT_CONFIG.ERRORS.CODES.VALIDATION_ERROR
        });
      }

      // Validate jobIds format
      for (const jobId of jobIds) {
        if (!jobId || typeof jobId !== 'string' || !jobId.startsWith('job_')) {
          return res.status(400).json({
            error: 'Invalid job ID',
            message: `Invalid job ID format: ${jobId}. Job IDs must start with "job_"`,
            errorCode: EXPORT_CONFIG.ERRORS.CODES.VALIDATION_ERROR
          });
        }
      }

      // Validate format
      if (!EXPORT_CONFIG.VALID_BATCH_FORMATS.includes(format)) {
        return res.status(400).json({
          error: 'Invalid format',
          message: `Format must be one of: ${EXPORT_CONFIG.VALID_BATCH_FORMATS.join(', ')}`,
          errorCode: EXPORT_CONFIG.ERRORS.CODES.INVALID_FORMAT
        });
      }

      // Check batch limits
      if (jobIds.length > EXPORT_CONFIG.LIMITS.MAX_JOBS_BATCH) {
        return res.status(413).json({
          error: 'Batch limit exceeded',
          message: `Maximum ${EXPORT_CONFIG.LIMITS.MAX_JOBS_BATCH} jobs allowed per batch request`,
          errorCode: EXPORT_CONFIG.ERRORS.CODES.LIMIT_EXCEEDED,
          details: {
            maxAllowed: EXPORT_CONFIG.LIMITS.MAX_JOBS_BATCH,
            requestedCount: jobIds.length
          }
        });
      }

      // Remove duplicates
      const uniqueJobIds = [...new Set(jobIds)];

      const jobStatuses = [];
      const jobResults = [];
      let totalInvoices = 0;

      // Collect data from all jobs
      for (const jobId of uniqueJobIds) {
        try {
          const jobStatus = processingAPI.getJobStatus(jobId);
          const results = processingAPI.getJobResults(jobId);

          // Only include completed jobs
          if (jobStatus.status === 'completed') {
            jobStatuses.push(jobStatus);
            jobResults.push(results);

            // Count invoices for limit checking
            const successfulResults = results.filter(r => r.success);
            totalInvoices += successfulResults.length;
          } else {
            // Log warning for non-completed jobs
            console.warn(`Skipping job ${jobId}: status is ${jobStatus.status}`);
          }
        } catch (error) {
          // Log error but continue with other jobs
          console.error(`Error processing job ${jobId}:`, error.message);
        }
      }

      // Check total invoice limit
      if (totalInvoices > EXPORT_CONFIG.LIMITS.MAX_INVOICES_BATCH) {
        return res.status(413).json({
          error: 'Invoice limit exceeded',
          message: `Total invoices across all jobs exceeds limit of ${EXPORT_CONFIG.LIMITS.MAX_INVOICES_BATCH}`,
          errorCode: EXPORT_CONFIG.ERRORS.CODES.LIMIT_EXCEEDED,
          details: {
            maxAllowed: EXPORT_CONFIG.LIMITS.MAX_INVOICES_BATCH,
            totalInvoices: totalInvoices
          }
        });
      }

      // Check if we have any valid jobs
      if (jobStatuses.length === 0) {
        return res.status(404).json({
          error: 'No valid jobs found',
          message: 'None of the specified jobs were found or completed',
          errorCode: EXPORT_CONFIG.ERRORS.CODES.VALIDATION_ERROR
        });
      }

      // Calculate batch totals
      const batchTotals = calculateBatchTotals(jobStatuses, jobResults);

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `batch-totals-${timestamp}.${format}`;

      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      let content;
      let contentType;

      switch (format) {
        case 'json':
          content = JSON.stringify(batchTotals, null, 2);
          contentType = 'application/json';
          break;

        case 'csv':
          contentType = 'text/csv';
          res.setHeader('Content-Type', contentType);

          const stringifier = stringify({
            header: true,
            columns: EXPORT_CONFIG.BATCH_TOTALS.CSV_HEADERS
          });

          stringifier.pipe(res);

          // Write job-level summaries
          batchTotals.jobs.forEach(job => {
            stringifier.write({
              'Job ID': job.jobId,
              'Job Created Date': job.created ? new Date(job.created).toISOString().split('T')[0] : '',
              'Job Completed Date': job.completed ? new Date(job.completed).toISOString().split('T')[0] : '',
              'Total Invoices': job.invoiceCount,
              'Successful Invoices': job.successfulInvoices,
              'Failed Invoices': job.failedInvoices,
              'Total Amount': job.totals.total ? job.totals.total.toFixed(2) : '0.00',
              'Total Subtotal': job.totals.subtotal ? job.totals.subtotal.toFixed(2) : '0.00',
              'Total Shipping': job.totals.shipping ? job.totals.shipping.toFixed(2) : '0.00',
              'Total Tax': job.totals.tax ? job.totals.tax.toFixed(2) : '0.00',
              'Total Discount': job.totals.discount ? job.totals.discount.toFixed(2) : '0.00',
              'Currency': job.currency || '',
              'Success Rate (%)': job.successRate
            });
          });

          // Write batch summary row
          stringifier.write({
            'Job ID': 'BATCH_TOTAL',
            'Job Created Date': '',
            'Job Completed Date': '',
            'Total Invoices': batchTotals.totalInvoices,
            'Successful Invoices': batchTotals.successfulInvoices,
            'Failed Invoices': batchTotals.failedInvoices,
            'Total Amount': batchTotals.totals.total.toFixed(2),
            'Total Subtotal': batchTotals.totals.subtotal.toFixed(2),
            'Total Shipping': batchTotals.totals.shipping.toFixed(2),
            'Total Tax': batchTotals.totals.tax.toFixed(2),
            'Total Discount': batchTotals.totals.discount.toFixed(2),
            'Currency': 'MULTI', // Indicates multiple currencies
            'Success Rate (%)': batchTotals.totalInvoices > 0
              ? ((batchTotals.successfulInvoices / batchTotals.totalInvoices) * 100).toFixed(1)
              : '0.0'
          });

          stringifier.end();
          return; // Important: exit early since response is handled by stream

        default:
          return res.status(400).json({
            error: 'Unsupported format',
            message: `Format '${format}' is not supported for batch totals`
          });
      }

      // Set content type and send response
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf8'));
      res.send(content);

    } catch (error) {
      // Log full error details server-side
      console.error('Batch totals export error:', {
        jobIds: req.body.jobIds,
        format,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      // Return safe error messages to client
      res.status(500).json({
        error: 'Batch totals export failed',
        message: EXPORT_CONFIG.ERRORS.MESSAGES.EXPORT_FAILED,
        errorCode: EXPORT_CONFIG.ERRORS.CODES.EXPORT_ERROR
      });
    }
  });
};
