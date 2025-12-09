// API endpoint for exporting job results in various formats
const ProcessingAPI = require('./processing');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { transformResultsForExport } = require('../utils/result-transformer');
const EXPORT_CONFIG = require('../../config/export.config');
const PDFReportGenerator = require('../utils/pdf-report-generator');
const { stringify } = require('csv-stringify');

module.exports = (app, testProcessingAPI = null) => {
  // Allow dependency injection for testing - prioritize testProcessingAPI
  const processingAPI = testProcessingAPI || new ProcessingAPI();
  // GET /api/export/:jobId?format=json|csv|pdf&template=summary|detailed|financial - Export job results
  app.get('/api/export/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const { format = 'json', template = 'detailed' } = req.query;


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
          content = JSON.stringify({
            jobId: jobId,
            exportDate: new Date().toISOString(),
            summary: summary,
            results: transformedResults,
            errors: errors
          }, null, 2);
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
};
