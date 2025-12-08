// API endpoint for exporting job results in various formats
const ProcessingAPI = require('./processing');
const { invoiceToCSV } = require('../utils/csv-converter');
const Reporting = require('../reports/reporting');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// Initialize dependencies
const processingAPI = new ProcessingAPI();
const reporting = new Reporting();

module.exports = (app) => {
  // GET /api/export/:jobId?format=json|csv|pdf&template=summary|detailed|financial - Export job results
  app.get('/api/export/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params;
      const { format = 'json', template = 'detailed' } = req.query;

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

      // Validate template for PDF format
      const validTemplates = ['summary', 'detailed', 'financial'];
      if (format === 'pdf' && !validTemplates.includes(template)) {
        return res.status(400).json({
          error: 'Invalid template',
          message: `PDF template must be one of: ${validTemplates.join(', ')}`
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

      if (transformedResults.length === 0) {
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

            if (result.success && result.items && result.items.length > 0) {
              // Create row for each item
              result.items.forEach((item, index) => {
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
          // Generate enhanced PDF report
          const { template = 'detailed' } = req.query;
          content = await generateEnhancedPDFReport(transformedResults, jobId, summary, errors, template);
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
 * Generate an enhanced PDF report from invoice data with professional layout
 * @param {Array} invoices - Array of transformed invoice results
 * @param {string} jobId - The job ID for the report
 * @param {Object} summary - Processing summary
 * @param {Array} errors - Array of processing errors
 * @param {string} template - Report template ('summary', 'detailed', 'financial')
 * @returns {Buffer} PDF content as a buffer
 */
async function generateEnhancedPDFReport(invoices, jobId, summary, errors, template = 'detailed') {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Color scheme
  const colors = {
    primary: rgb(0.2, 0.4, 0.8),      // Blue
    secondary: rgb(0.8, 0.4, 0.2),    // Orange
    success: rgb(0.2, 0.8, 0.4),      // Green
    warning: rgb(0.8, 0.8, 0.2),      // Yellow
    danger: rgb(0.8, 0.2, 0.2),       // Red
    text: rgb(0.2, 0.2, 0.2),         // Dark gray
    textLight: rgb(0.6, 0.6, 0.6),    // Light gray
    background: rgb(0.95, 0.95, 0.95) // Light gray background
  };

  let currentPage = null;
  let yPosition = 0;
  const margin = 50;
  const pageWidth = 595;  // A4 width in points
  const pageHeight = 842; // A4 height in points
  const contentWidth = pageWidth - 2 * margin;

  // Helper functions
  function addNewPage() {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    yPosition = pageHeight - margin;

    // Add header
    drawHeader();
    yPosition -= 60; // Space after header

    return currentPage;
  }

  function drawHeader() {
    const headerY = pageHeight - 30;

    // Company title
    currentPage.drawText('Invoice Processing Report', {
      x: margin,
      y: headerY,
      size: 16,
      font: helveticaBold,
      color: colors.primary
    });

    // Job info and date
    const timestamp = new Date().toLocaleString();
    currentPage.drawText(`Job: ${jobId} | Generated: ${timestamp}`, {
      x: margin,
      y: headerY - 20,
      size: 8,
      font: helvetica,
      color: colors.textLight
    });

    // Page number
    const pageNum = pdfDoc.getPageCount();
    currentPage.drawText(`Page ${pageNum}`, {
      x: pageWidth - margin - 50,
      y: headerY - 20,
      size: 8,
      font: helvetica,
      color: colors.textLight
    });
  }

  function drawFooter() {
    const footerY = margin + 20;
    currentPage.drawText('Generated by Invoice Parser - Professional Invoice Processing Solution', {
      x: margin,
      y: footerY,
      size: 7,
      font: helvetica,
      color: colors.textLight
    });
  }

  function checkPageSpace(neededSpace) {
    if (yPosition - neededSpace < margin + 50) { // +50 for footer space
      drawFooter();
      addNewPage();
      return true;
    }
    return false;
  }

  function drawText(text, x, y, options = {}) {
    const {
      font = helvetica,
      size = 10,
      color = colors.text,
      maxWidth = contentWidth,
      align = 'left'
    } = options;

    let actualX = x;
    if (align === 'center') {
      const textWidth = font.widthOfTextAtSize(text, size);
      actualX = x - textWidth / 2;
    } else if (align === 'right') {
      const textWidth = font.widthOfTextAtSize(text, size);
      actualX = x - textWidth;
    }

    currentPage.drawText(text, {
      x: actualX,
      y,
      size,
      font,
      color,
      maxWidth
    });
  }

  function drawTable(headers, rows, x, startY, options = {}) {
    const { colWidths = [], rowHeight = 20, headerColor = colors.primary, alternateRowColor = false } = options;
    let currentY = startY;

    // Calculate column widths if not provided
    const numCols = headers.length;
    const defaultColWidth = contentWidth / numCols;
    const actualColWidths = colWidths.length === numCols ? colWidths :
      headers.map(() => defaultColWidth);

    // Draw header
    let currentX = x;
    for (let i = 0; i < headers.length; i++) {
      // Header background
      currentPage.drawRectangle({
        x: currentX,
        y: currentY - rowHeight + 2,
        width: actualColWidths[i],
        height: rowHeight,
        color: headerColor,
        opacity: 0.1
      });

      drawText(headers[i], currentX + 5, currentY - 5, {
        font: helveticaBold,
        size: 9,
        color: colors.text
      });
      currentX += actualColWidths[i];
    }
    currentY -= rowHeight;

    // Draw rows
    rows.forEach((row, rowIndex) => {
      checkPageSpace(rowHeight);

      if (alternateRowColor && rowIndex % 2 === 1) {
        currentPage.drawRectangle({
          x,
          y: currentY - rowHeight + 2,
          width: contentWidth,
          height: rowHeight,
          color: colors.background
        });
      }

      currentX = x;
      for (let i = 0; i < row.length; i++) {
        drawText(row[i] || '', currentX + 5, currentY - 5, {
          size: 8,
          color: colors.text
        });
        currentX += actualColWidths[i];
      }
      currentY -= rowHeight;
    });

    return currentY;
  }

  function drawBarChart(data, x, y, width, height, options = {}) {
    const { title = '', color = colors.primary, maxValue = Math.max(...data.map(d => d.value)) } = options;

    // Title
    drawText(title, x + width / 2, y + height + 10, {
      font: helveticaBold,
      size: 11,
      align: 'center'
    });

    const barWidth = width / data.length * 0.8;
    const barSpacing = width / data.length * 0.2;
    const chartHeight = height - 40; // Space for labels

    data.forEach((item, index) => {
      const barHeight = (item.value / maxValue) * chartHeight;
      const barX = x + index * (barWidth + barSpacing);
      const barY = y + 30;

      // Draw bar
      currentPage.drawRectangle({
        x: barX,
        y: barY,
        width: barWidth,
        height: barHeight,
        color
      });

      // Value label on bar
      if (barHeight > 15) {
        drawText(item.value.toString(), barX + barWidth / 2, barY + barHeight - 10, {
          size: 7,
          color: rgb(1, 1, 1),
          align: 'center'
        });
      }

      // Label below bar
      drawText(item.label, barX + barWidth / 2, barY - 15, {
        size: 7,
        align: 'center'
      });
    });
  }

  // Start generating the PDF
  addNewPage();

  // Executive Summary Section
  if (template !== 'financial') {
    drawText('Executive Summary', margin, yPosition, {
      font: helveticaBold,
      size: 14,
      color: colors.primary
    });
    yPosition -= 30;

    // Key metrics in a nice layout
    const metrics = [
      { label: 'Total Files Processed', value: summary.totalFiles, color: colors.primary },
      { label: 'Successful Processing', value: summary.processedFiles, color: colors.success },
      { label: 'Processing Failures', value: summary.failedFiles, color: colors.danger },
      { label: 'Success Rate', value: `${summary.successRate}%`, color: summary.successRate >= 80 ? colors.success : colors.warning }
    ];

    const metricWidth = contentWidth / 2;
    let metricY = yPosition;

    metrics.forEach((metric, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = margin + col * metricWidth;

      if (col === 0 && row > 0) metricY -= 40;

      // Metric box
      currentPage.drawRectangle({
        x,
        y: metricY - 35,
        width: metricWidth - 10,
        height: 30,
        color: metric.color,
        opacity: 0.1,
        borderColor: metric.color,
        borderWidth: 1
      });

      drawText(metric.label, x + 10, metricY - 10, {
        font: helveticaBold,
        size: 9
      });
      drawText(metric.value.toString(), x + 10, metricY - 25, {
        font: helvetica,
        size: 12,
        color: metric.color
      });
    });

    yPosition -= 90;
  }

  // Financial Summary with Chart
  if (template !== 'summary' && invoices.length > 0) {
    checkPageSpace(200);

    drawText('Financial Overview', margin, yPosition, {
      font: helveticaBold,
      size: 14,
      color: colors.primary
    });
    yPosition -= 30;

    const invoicesWithAmounts = invoices.filter(inv => inv.totals?.total != null && typeof inv.totals.total === 'number');
    if (invoicesWithAmounts.length > 0) {
      const totalAmount = invoicesWithAmounts.reduce((sum, inv) => sum + inv.totals.total, 0);
      const averageAmount = totalAmount / invoicesWithAmounts.length;

      // Financial metrics
      const financialData = [
        { label: 'Total Value', value: totalAmount },
        { label: 'Average Value', value: averageAmount },
        { label: 'Invoices', value: invoicesWithAmounts.length }
      ];

      drawBarChart(financialData, margin, yPosition - 150, contentWidth, 120, {
        title: 'Financial Summary',
        color: colors.secondary
      });

      yPosition -= 180;
    }
  }

  // Detailed Invoice Table
  if (template === 'detailed' && invoices.length > 0) {
    checkPageSpace(100);

    drawText('Invoice Details', margin, yPosition, {
      font: helveticaBold,
      size: 14,
      color: colors.primary
    });
    yPosition -= 30;

    const tableHeaders = ['Order #', 'Date', 'Customer', 'Items', 'Total', 'Status'];
    const tableRows = invoices.slice(0, 20).map(invoice => [
      invoice.orderNumber || 'N/A',
      invoice.orderDate || 'N/A',
      invoice.customerInfo?.name || 'N/A',
      invoice.items?.length?.toString() || '0',
      invoice.totals?.total && typeof invoice.totals.total === 'number' ? `$${invoice.totals.total.toFixed(2)}` : 'N/A',
      invoice.validationStatus === 'valid' ? '✓ Valid' : '⚠ Issues'
    ]);

    yPosition = drawTable(tableHeaders, tableRows, margin, yPosition, {
      colWidths: [80, 70, 120, 50, 70, 60],
      alternateRowColor: true
    });
    yPosition -= 20;
  }

  // Processing Errors
  if (errors.length > 0 && template !== 'financial') {
    checkPageSpace(80);

    drawText('Processing Errors', margin, yPosition, {
      font: helveticaBold,
      size: 14,
      color: colors.danger
    });
    yPosition -= 30;

    const errorHeaders = ['File', 'Error'];
    const errorRows = errors.slice(0, 10).map(error => [
      error.filename,
      error.error || 'Unknown error'
    ]);

    yPosition = drawTable(errorHeaders, errorRows, margin, yPosition, {
      colWidths: [200, contentWidth - 200],
      headerColor: colors.danger
    });
  }

  // Final footer
  drawFooter();

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}