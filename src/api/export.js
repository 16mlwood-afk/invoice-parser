// API endpoint for exporting job results in various formats
const ProcessingAPI = require('./processing');
const { invoiceToCSV } = require('../utils/csv-converter');
const Reporting = require('../reports/reporting');
const { PDFDocument, rgb } = require('pdf-lib');

// Initialize dependencies
const processingAPI = new ProcessingAPI();
const reporting = new Reporting();

module.exports = (app) => {
  // GET /api/export/:jobId?format=json|csv|pdf - Export job results
  app.get('/api/export/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params;
      const { format = 'json' } = req.query;

      // Validate jobId format
      if (!jobId || !jobId.startsWith('job_')) {
        return res.status(400).json({
          error: 'Invalid job ID',
          message: 'Job ID must be provided and start with "job_"'
        });
      }

      // Validate format
      const validFormats = ['json', 'csv', 'pdf'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({
          error: 'Invalid format',
          message: `Format must be one of: ${validFormats.join(', ')}`
        });
      }

      // Get job status first to check if job exists
      const jobStatus = processingAPI.getJobStatus(jobId);

      // Get results using the same logic as the results API
      const rawResults = processingAPI.getJobResults(jobId);

      if (!rawResults || rawResults.length === 0) {
        return res.status(404).json({
          error: 'No results found',
          message: 'No processing results available for this job'
        });
      }

      // Transform results to match frontend format (same as results.js)
      const transformedResults = rawResults
        .filter(result => result.success)
        .map(result => {
          const data = result.data;
          if (!data) {
            return {
              filename: result.filename,
              orderNumber: null,
              orderDate: null,
              customerInfo: null,
              items: [],
              totals: {
                subtotal: null,
                shipping: null,
                tax: null,
                total: null
              },
              currency: null,
              validationStatus: 'warning',
              validationErrors: ['No data extracted from invoice']
            };
          }
          return {
            filename: result.filename,
            orderNumber: data.orderNumber,
            orderDate: data.orderDate,
            customerInfo: data.customerInfo,
            items: data.items || [],
            totals: {
              subtotal: data.subtotal,
              shipping: data.shipping,
              tax: data.tax,
              total: data.total
            },
            currency: data.currency,
            validationStatus: data.validation?.isValid ? 'valid' : 'warning',
            validationErrors: data.validation?.warnings?.map(w => w.message) || []
          };
        });

      // Extract invoice data for PDF generation (include all transformed results)
      const invoices = transformedResults;

      if (transformedResults.length === 0 && errors.length === 0) {
        return res.status(404).json({
          error: 'No results',
          message: 'No processing results found for export'
        });
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

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `invoice-results-${jobId}-${timestamp}.${format}`;

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
          // Generate CSV using existing converter utility
          const csvRows = [];

          // Add headers
          csvRows.push([
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
          ]);

          // Add data rows
          transformedResults.forEach(result => {
            const baseRow = [
              result.filename || '',
              result.orderNumber || '',
              result.orderDate || '',
              result.customerInfo?.name || '',
              result.customerInfo?.email || '',
              '', // Item Description (filled below)
              '', // Item Quantity
              '', // Item Unit Price
              '', // Item Total
              result.totals?.subtotal || '',
              result.totals?.shipping || '',
              result.totals?.tax || '',
              result.totals?.total || '',
              result.currency || 'USD',
              result.validationStatus === 'valid' ? 'valid' : 'warning',
              result.validationErrors?.join('; ') || '',
              '' // processedAt not available in transformed results
            ];

            if (result.success && invoice?.items && invoice.items.length > 0) {
              // Create row for each item
              invoice.items.forEach((item, index) => {
                const itemRow = [...baseRow];
                itemRow[5] = item.description || ''; // Item Description
                itemRow[6] = item.quantity || ''; // Item Quantity
                itemRow[7] = item.unitPrice || ''; // Item Unit Price
                itemRow[8] = item.total || ''; // Item Total
                csvRows.push(itemRow);
              });
            } else {
              // Single row for invoice without items
              csvRows.push(baseRow);
            }
          });

          // Convert to CSV string
          content = csvRows.map(row =>
            row.map(field => {
              const str = String(field || '');
              // Escape quotes and wrap in quotes if contains comma, quote, or newline
              if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                return '"' + str.replace(/"/g, '""') + '"';
              }
              return str;
            }).join(',')
          ).join('\n');
          contentType = 'text/csv';
          break;

        case 'pdf':
          // Generate PDF report using pdf-lib
          content = await generatePDFReport(transformedResults, jobId, summary, errors);
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
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.send(content);

    } catch (error) {
      console.error('Export error:', error);

      if (error.message === 'Job not found') {
        return res.status(404).json({
          error: 'Job not found',
          message: 'The specified job ID does not exist'
        });
      }

      if (error.message === 'Job is not completed yet') {
        return res.status(409).json({
          error: 'Job not completed',
          message: 'The job is still processing. Export is only available for completed jobs.'
        });
      }

      res.status(500).json({
        error: 'Export failed',
        message: error.message
      });
    }
  });
};

/**
 * Generate a PDF report from invoice data
 * @param {Array} invoices - Array of transformed invoice results
 * @param {string} jobId - The job ID for the report
 * @param {Object} summary - Processing summary
 * @param {Array} errors - Array of processing errors
 * @returns {Buffer} PDF content as a buffer
 */
async function generatePDFReport(invoices, jobId, summary, errors) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const fontSize = 12;
  const titleFontSize = 18;
  const margin = 50;
  let yPosition = height - margin;

  // Helper function to add text with word wrapping
  function addText(text, x, y, size = fontSize, maxWidth = width - 2 * margin) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const textWidth = testLine.length * (size * 0.6); // Rough estimate

      if (textWidth > maxWidth && line) {
        page.drawText(line, { x, y: currentY, size, color: rgb(0, 0, 0) });
        line = word;
        currentY -= size + 2;
      } else {
        line = testLine;
      }
    }

    if (line) {
      page.drawText(line, { x, y: currentY, size, color: rgb(0, 0, 0) });
      currentY -= size + 2;
    }

    return currentY;
  }

  // Helper function to add a new page if needed
  function checkPageSpace(neededSpace) {
    if (yPosition - neededSpace < margin) {
      page = pdfDoc.addPage();
      yPosition = height - margin;
      return true;
    }
    return false;
  }

  // Title
  yPosition = addText('Invoice Processing Report', margin, yPosition, titleFontSize);
  yPosition -= 10;

  // Report metadata
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  yPosition = addText(`Job ID: ${jobId}`, margin, yPosition);
  yPosition = addText(`Generated: ${timestamp}`, margin, yPosition);
  yPosition -= 20;

  // Summary section
  yPosition = addText('Summary', margin, yPosition, 14);
  yPosition -= 5;

  yPosition = addText(`Total Files: ${summary.totalFiles}`, margin + 20, yPosition);
  yPosition = addText(`Successfully Processed: ${summary.processedFiles}`, margin + 20, yPosition);
  yPosition = addText(`Failed: ${summary.failedFiles}`, margin + 20, yPosition);
  yPosition = addText(`Success Rate: ${summary.successRate}%`, margin + 20, yPosition);
  yPosition -= 20;

  // Financial summary if we have invoices with amounts
  const invoicesWithAmounts = invoices.filter(inv => inv.totals?.total != null);
  if (invoicesWithAmounts.length > 0) {
    const totalAmount = invoicesWithAmounts.reduce((sum, inv) => {
      const amount = typeof inv.totals.total === 'number' ? inv.totals.total : 0;
      return sum + amount;
    }, 0);

    const averageAmount = totalAmount / invoicesWithAmounts.length;

    yPosition = addText('Financial Summary', margin, yPosition, 14);
    yPosition -= 5;
    yPosition = addText(`Total Invoice Amount: $${totalAmount.toFixed(2)}`, margin + 20, yPosition);
    yPosition = addText(`Average Invoice Amount: $${averageAmount.toFixed(2)}`, margin + 20, yPosition);
    yPosition = addText(`Invoices with amounts: ${invoicesWithAmounts.length}/${invoices.length}`, margin + 20, yPosition);
    yPosition -= 20;
  }

  // Invoice details
  if (invoices.length > 0) {
    checkPageSpace(50);
    yPosition = addText('Invoice Details', margin, yPosition, 14);
    yPosition -= 10;

    for (const invoice of invoices) {
      checkPageSpace(80); // Check if we need space for invoice details

      // Invoice header
      const filename = invoice.filename || 'Unknown';
      yPosition = addText(`Invoice: ${filename}`, margin, yPosition, 12);
      yPosition -= 5;

      // Basic info
      if (invoice.orderNumber) {
        yPosition = addText(`Order Number: ${invoice.orderNumber}`, margin + 20, yPosition);
      }
      if (invoice.orderDate) {
        yPosition = addText(`Order Date: ${invoice.orderDate}`, margin + 20, yPosition);
      }

      // Customer info
      if (invoice.customerInfo?.name) {
        yPosition = addText(`Customer: ${invoice.customerInfo.name}`, margin + 20, yPosition);
      }
      if (invoice.customerInfo?.email) {
        yPosition = addText(`Email: ${invoice.customerInfo.email}`, margin + 20, yPosition);
      }

      // Validation status
      yPosition = addText(`Status: ${invoice.validationStatus}`, margin + 20, yPosition);
      if (invoice.validationErrors && invoice.validationErrors.length > 0) {
        yPosition = addText(`Issues: ${invoice.validationErrors.join(', ')}`, margin + 20, yPosition);
      }

      // Financial info
      const currency = invoice.currency || 'USD';
      if (invoice.totals?.total != null) {
        yPosition = addText(`Total: ${currency} ${invoice.totals.total.toFixed(2)}`, margin + 20, yPosition);
      }

      if (invoice.totals?.subtotal != null) {
        yPosition = addText(`Subtotal: ${currency} ${invoice.totals.subtotal.toFixed(2)}`, margin + 20, yPosition);
      }
      if (invoice.totals?.tax != null) {
        yPosition = addText(`Tax: ${currency} ${invoice.totals.tax.toFixed(2)}`, margin + 20, yPosition);
      }
      if (invoice.totals?.shipping != null) {
        yPosition = addText(`Shipping: ${currency} ${invoice.totals.shipping.toFixed(2)}`, margin + 20, yPosition);
      }

      // Items
      if (invoice.items && invoice.items.length > 0) {
        checkPageSpace(30);
        yPosition = addText('Items:', margin + 20, yPosition);
        yPosition -= 5;

        for (const item of invoice.items.slice(0, 5)) { // Limit to first 5 items to avoid overflow
          checkPageSpace(20);
          const itemDesc = item.description || 'No description';
          const itemQty = item.quantity || 1;
          const itemPrice = typeof item.unitPrice === 'number' ? item.unitPrice.toFixed(2) :
                           typeof item.price === 'number' ? item.price.toFixed(2) : 'N/A';
          yPosition = addText(`• ${itemDesc} (Qty: ${itemQty}, Price: ${currency} ${itemPrice})`,
                             margin + 40, yPosition, 10);
        }

        if (invoice.items.length > 5) {
          yPosition = addText(`... and ${invoice.items.length - 5} more items`, margin + 40, yPosition, 10);
        }
      }

      yPosition -= 15; // Space between invoices
    }
  }

  // Failed files section
  if (errors.length > 0) {
    checkPageSpace(50);
    yPosition = addText('Failed Files', margin, yPosition, 14);
    yPosition -= 10;

    for (const failed of errors.slice(0, 10)) { // Limit to first 10 failures
      checkPageSpace(20);
      yPosition = addText(`${failed.filename}: ${failed.error || 'Unknown error'}`, margin + 20, yPosition, 10);
    }

    if (errors.length > 10) {
      yPosition = addText(`... and ${errors.length - 10} more failures`, margin + 20, yPosition, 10);
    }
  }

  // Footer
  const finalPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
  const finalY = margin + 20;
  finalPage.drawText(`Report generated by Invoice Parser - Job ${jobId}`, {
    x: margin,
    y: finalY,
    size: 8,
    color: rgb(0.5, 0.5, 0.5)
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}