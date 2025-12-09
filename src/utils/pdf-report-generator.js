/**
 * PDF Report Generator for invoice processing results
 * Generates professional PDF reports with charts, tables, and summaries
 */

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const PDFThemeEngine = require('./pdf-theme-engine');

class PDFReportGenerator {
  constructor(config = {}, themeEngine = null) {
    this.config = {
      pageSize: [595, 842], // A4
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      ...config
    };

    // Initialize theme engine
    this.themeEngine = themeEngine || new PDFThemeEngine();

    this.pdfDoc = null;
    this.helvetica = null;
    this.helveticaBold = null;
    this.colors = {};
    this.currentPage = null;
    this.yPosition = 0;
    this.currentPageNumber = 0;
    this.totalPages = 0;
  }

  /**
   * Sanitize text for PDF compatibility by handling problematic Unicode characters
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text safe for PDF fonts
   */
  sanitizeText(text) {
    if (!text || typeof text !== 'string') return text || '';

    // Handle specific problematic characters that don't render well in PDFs
    return text
      .replace(/✓/g, '√') // Replace checkmark with square root (more compatible)
      .replace(/✔/g, '√') // Replace heavy checkmark with square root
      .replace(/×/g, 'x') // Replace multiplication sign
      .replace(/÷/g, '/') // Replace division sign
      .replace(/[^\x00-\xFF]/g, '?'); // Only replace characters beyond Latin-1 with ?
  }

  /**
   * Generate a complete PDF report
   * @param {Array} invoices - Array of transformed invoice results
   * @param {string} jobId - The job ID for the report
   * @param {Object} summary - Processing summary
   * @param {Array} errors - Array of processing errors
   * @param {string} template - Report template ('summary', 'detailed', 'financial')
   * @returns {Buffer} PDF content as a buffer
   */
  async generateReport(invoices, jobId, summary, errors, template = 'detailed') {
    // Initialize PDF document
    this.pdfDoc = await PDFDocument.create();
    this.helvetica = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
    this.helveticaBold = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Set up colors and theme (also loads config)
    this.setupColors();

    // Add first page
    this.addNewPage(jobId);

    // Generate report based on template
    switch (template) {
      case 'summary':
        await this.generateSummaryReport(invoices, jobId, summary, errors);
        break;
      case 'detailed':
        await this.generateDetailedReport(invoices, jobId, summary, errors);
        break;
      case 'financial':
        await this.generateFinancialReport(invoices, jobId, summary, errors);
        break;
      default:
        await this.generateDetailedReport(invoices, jobId, summary, errors);
    }

    // Update total pages and refresh all footers with correct page numbers
    this.totalPages = this.pdfDoc.getPageCount();
    this.updateAllPageFooters();

    const pdfBytes = await this.pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  setupColors() {
    const EXPORT_CONFIG = require('../../config/export.config');

    // Store config reference first
    this.config = EXPORT_CONFIG;

    // Set up page dimensions and layout constants using theme
    const margins = this.themeEngine.getMargins();
    this.pageWidth = EXPORT_CONFIG.PDF.PAGE_SIZE[0];
    this.pageHeight = EXPORT_CONFIG.PDF.PAGE_SIZE[1];
    this.margin = margins.left;
    this.contentWidth = EXPORT_CONFIG.PDF.CONTENT_WIDTH;

    // Set up colors from theme engine
    this.colors = {
      primary: this.themeEngine.getPDFColor('primary'),
      secondary: this.themeEngine.getPDFColor('secondary'),
      success: this.themeEngine.getPDFColor('success'),
      warning: this.themeEngine.getPDFColor('warning'),
      danger: this.themeEngine.getPDFColor('danger'),
      text: this.themeEngine.getPDFColor('text'),
      textLight: this.themeEngine.getPDFColor('textLight'),
      background: this.themeEngine.getPDFColor('background')
    };
  }

  addNewPage(jobId = null) {
    this.currentPage = this.pdfDoc.addPage(this.config.PDF.PAGE_SIZE);
    this.currentPageNumber++;
    this.yPosition = this.pageHeight - this.margin;

    // Add header
    this.drawHeader(jobId);
    this.yPosition -= this.themeEngine.getFontSize('h3') + 10; // Header height based on theme

    return this.currentPage;
  }

  drawHeader(jobId) {
    const headerY = this.pageHeight - 30;
    const branding = this.themeEngine.getBranding();

    // Left side: Company name/logo
    this.currentPage.drawText(branding.companyName, {
      x: this.margin,
      y: headerY,
      size: this.themeEngine.getFontSize('body'),
      font: this.helveticaBold,
      color: this.colors.primary
    });

    // Center: Report title
    const title = 'Invoice Processing Report';
    const titleWidth = this.helveticaBold.widthOfTextAtSize(title, this.themeEngine.getFontSize('h3'));
    const centerX = this.pageWidth / 2 - titleWidth / 2;

    this.currentPage.drawText(title, {
      x: centerX,
      y: headerY,
      size: this.themeEngine.getFontSize('h3'),
      font: this.helveticaBold,
      color: this.colors.text
    });

    // Right side: Page number
    const pageText = `Page ${this.currentPageNumber}`;
    const pageWidth = this.helvetica.widthOfTextAtSize(pageText, this.themeEngine.getFontSize('caption'));
    const rightX = this.pageWidth - this.margin - pageWidth;

    this.currentPage.drawText(pageText, {
      x: rightX,
      y: headerY,
      size: this.themeEngine.getFontSize('caption'),
      font: this.helvetica,
      color: this.colors.textLight
    });

    // Add subtle divider line below header
    const dividerY = headerY - this.themeEngine.getFontSize('h3') - 5;
    this.currentPage.drawLine({
      start: { x: this.margin, y: dividerY },
      end: { x: this.pageWidth - this.margin, y: dividerY },
      thickness: 0.5,
      color: this.colors.textLight,
    });
  }

  drawFooter() {
    const footerY = this.margin + 20;
    const branding = this.themeEngine.getBranding();

    // Left side: Generation metadata
    const leftText = `Generated by ${branding.companyName}`;
    this.currentPage.drawText(leftText, {
      x: this.margin,
      y: footerY,
      size: this.themeEngine.getFontSize('caption'),
      font: this.helvetica,
      color: this.colors.textLight
    });

    // Center: Confidentiality level
    const centerText = 'Confidential - For Internal Use Only';
    const centerWidth = this.helvetica.widthOfTextAtSize(centerText, this.themeEngine.getFontSize('caption'));
    const centerX = this.pageWidth / 2 - centerWidth / 2;

    this.currentPage.drawText(centerText, {
      x: centerX,
      y: footerY,
      size: this.themeEngine.getFontSize('caption'),
      font: this.helvetica,
      color: this.colors.textLight
    });

    // Right side: Page X of Y
    const pageText = `Page ${this.currentPageNumber} of ${this.totalPages || this.pdfDoc.getPageCount()}`;
    const pageWidth = this.helvetica.widthOfTextAtSize(pageText, this.themeEngine.getFontSize('caption'));
    const rightX = this.pageWidth - this.margin - pageWidth;

    this.currentPage.drawText(pageText, {
      x: rightX,
      y: footerY,
      size: this.themeEngine.getFontSize('caption'),
      font: this.helvetica,
      color: this.colors.textLight
    });

    // Add subtle divider line above footer
    const dividerY = footerY + this.themeEngine.getFontSize('caption') + 5;
    this.currentPage.drawLine({
      start: { x: this.margin, y: dividerY },
      end: { x: this.pageWidth - this.margin, y: dividerY },
      thickness: 0.5,
      color: this.colors.textLight,
    });
  }

  /**
   * Update all page footers with correct total page count
   * This is called after all content is generated to fix "Page X of Y" numbering
   */
  updateAllPageFooters() {
    const pages = this.pdfDoc.getPages();
    this.totalPages = pages.length;

    // Reset page numbering and redraw all footers
    pages.forEach((page, index) => {
      // Temporarily set current page for footer drawing
      this.currentPage = page;
      this.currentPageNumber = index + 1;

      // Clear the footer area (this is a simplified approach)
      // In a production system, you might want to track footer positions more carefully
      this.drawFooter();
    });
  }

  /**
   * Draw a status indicator with appropriate symbol and color
   * @param {string} status - Status type (success, warning, danger, processing)
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} size - Font size (optional, defaults to body size)
   */
  drawStatusIndicator(status, x, y, size = null) {
    const indicator = this.themeEngine.getStatusIndicator(status);
    const fontSize = size || this.themeEngine.getFontSize('body');
    const color = this.colors[indicator.color] || this.colors.text;

    this.currentPage.drawText(indicator.symbol, {
      x,
      y,
      size: fontSize,
      font: this.helvetica,
      color,
    });
  }

  checkPageSpace(neededSpace) {
    const footerHeight = this.themeEngine.getFontSize('caption') + 40; // Footer height with padding
    if (this.yPosition - neededSpace < this.margin + footerHeight) {
      this.drawFooter();
      this.addNewPage();
      return true;
    }
    return false;
  }

  drawText(text, x, y, options = {}) {
    const {
      font = this.helvetica,
      size = this.themeEngine.getFontSize('body'),
      color = this.colors.text,
      maxWidth = this.contentWidth,
      align = 'left'
    } = options;

    // Sanitize text to handle problematic Unicode characters
    let sanitizedText = String(text || '');
    sanitizedText = this.sanitizeText(sanitizedText);

    let actualX = x;
    if (align === 'center') {
      const textWidth = font.widthOfTextAtSize(sanitizedText, size);
      actualX = x - textWidth / 2;
    } else if (align === 'right') {
      const textWidth = font.widthOfTextAtSize(sanitizedText, size);
      actualX = x - textWidth;
    }

    this.currentPage.drawText(sanitizedText, {
      x: actualX,
      y,
      size,
      font,
      color,
      maxWidth
    });
  }

  drawTable(headers, rows, x, startY, options = {}) {
    const { colWidths = [], rowHeight = this.config.PDF.SPACING.ROW_HEIGHT, headerColor = this.colors.primary, alternateRowColor = false } = options;
    let currentY = startY;

    // Calculate column widths if not provided
    const numCols = headers.length;
    const defaultColWidth = this.config.PDF.CONTENT_WIDTH / numCols;
    const actualColWidths = colWidths.length === numCols ? colWidths :
      headers.map(() => defaultColWidth);

    // Draw header
    let currentX = x;
    for (let i = 0; i < headers.length; i++) {
      // Header background
      this.currentPage.drawRectangle({
        x: currentX,
        y: currentY - rowHeight + 2,
        width: actualColWidths[i],
        height: rowHeight,
        color: headerColor,
        opacity: 0.1
      });

      this.drawText(headers[i], currentX + 5, currentY - 5, {
        font: this.helveticaBold,
        size: this.config.PDF.FONT_SIZES.TABLE_HEADER,
        color: this.colors.text
      });
      currentX += actualColWidths[i];
    }
    currentY -= rowHeight;

    // Draw rows
    rows.forEach((row, rowIndex) => {
      this.checkPageSpace(rowHeight);

      if (alternateRowColor && rowIndex % 2 === 1) {
        this.currentPage.drawRectangle({
          x,
          y: currentY - rowHeight + 2,
          width: this.config.PDF.CONTENT_WIDTH,
          height: rowHeight,
          color: this.colors.background
        });
      }

      currentX = x;
      for (let i = 0; i < row.length; i++) {
        this.drawText(row[i] || '', currentX + 5, currentY - 5, {
          size: this.config.PDF.FONT_SIZES.TABLE_CELL,
          color: this.colors.text
        });
        currentX += actualColWidths[i];
      }
      currentY -= rowHeight;
    });

    return currentY;
  }

  drawBarChart(data, x, y, width, height, options = {}) {
    const { title = '', color = this.colors.primary, maxValue = Math.max(...data.map(d => d.value)) } = options;

    // Title
    this.drawText(title, x + width / 2, y + height + 10, {
      font: this.helveticaBold,
      size: this.config.PDF.FONT_SIZES.SECTION_TITLE,
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
      this.currentPage.drawRectangle({
        x: barX,
        y: barY,
        width: barWidth,
        height: barHeight,
        color
      });

      // Value label on bar
      if (barHeight > 15) {
        this.drawText(item.value.toString(), barX + barWidth / 2, barY + barHeight - 10, {
          size: 7,
          color: rgb(1, 1, 1),
          align: 'center'
        });
      }

      // Label below bar
      this.drawText(item.label, barX + barWidth / 2, barY - 15, {
        size: 7,
        align: 'center'
      });
    });
  }

  async generateSummaryReport(invoices, jobId, summary, errors) {
    this.addSummarySection(summary);
    this.addErrorSection(errors);
  }

  async generateDetailedReport(invoices, jobId, summary, errors) {
    this.addSummarySection(summary);
    this.addFinancialOverview(invoices);
    this.addInvoiceTable(invoices);
    this.addErrorSection(errors);
  }

  async generateFinancialReport(invoices, jobId, summary, errors) {
    this.addFinancialOverview(invoices);
  }

  addSummarySection(summary) {
    this.drawText('Executive Summary', this.config.PDF.MARGINS.LEFT, this.yPosition, {
      font: this.helveticaBold,
      size: this.config.PDF.FONT_SIZES.SECTION_TITLE,
      color: this.colors.primary
    });
    this.yPosition -= this.config.PDF.SPACING.SECTION_SPACING;

    // Key metrics in a nice layout
    const metrics = [
      { label: 'Total Files Processed', value: summary.totalFiles, color: this.colors.primary },
      { label: 'Successful Processing', value: summary.processedFiles, color: this.colors.success },
      { label: 'Processing Failures', value: summary.failedFiles, color: this.colors.danger },
      { label: 'Success Rate', value: `${summary.successRate}%`, color: summary.successRate >= 80 ? this.colors.success : this.colors.warning }
    ];

    const metricWidth = this.config.PDF.SPACING.METRIC_BOX_WIDTH;
    let metricY = this.yPosition;

    metrics.forEach((metric, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = this.config.PDF.MARGINS.LEFT + col * (metricWidth + 10);

      if (col === 0 && row > 0) metricY -= this.config.PDF.SPACING.METRIC_BOX_HEIGHT + 10;

      // Metric box
      this.currentPage.drawRectangle({
        x,
        y: metricY - this.config.PDF.SPACING.METRIC_BOX_HEIGHT,
        width: metricWidth,
        height: this.config.PDF.SPACING.METRIC_BOX_HEIGHT,
        color: metric.color,
        opacity: 0.1,
        borderColor: metric.color,
        borderWidth: 1
      });

      this.drawText(metric.label, x + 10, metricY - 10, {
        font: this.helveticaBold,
        size: this.config.PDF.FONT_SIZES.METRIC_LABEL
      });
      this.drawText(metric.value.toString(), x + 10, metricY - 25, {
        font: this.helvetica,
        size: this.config.PDF.FONT_SIZES.METRIC_VALUE,
        color: metric.color
      });
    });

    this.yPosition -= 90;
  }

  addFinancialOverview(invoices) {
    const EXPORT_CONFIG = require('../../config/export.config');

    this.checkPageSpace(200);

    this.drawText('Financial Overview', this.config.PDF.MARGINS.LEFT, this.yPosition, {
      font: this.helveticaBold,
      size: this.config.PDF.FONT_SIZES.SECTION_TITLE,
      color: this.colors.primary
    });
    this.yPosition -= this.config.PDF.SPACING.SECTION_SPACING;

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

      this.drawBarChart(financialData, this.config.PDF.MARGINS.LEFT, this.yPosition - this.config.PDF.SPACING.BAR_CHART_HEIGHT, this.config.PDF.SPACING.BAR_CHART_WIDTH, this.config.PDF.SPACING.BAR_CHART_HEIGHT, {
        title: 'Financial Summary',
        color: this.colors.secondary
      });

      this.yPosition -= this.config.PDF.SPACING.BAR_CHART_HEIGHT + 30;
    }
  }

  addInvoiceTable(invoices) {
    const EXPORT_CONFIG = require('../../config/export.config');

    this.checkPageSpace(100);

    this.drawText('Invoice Details', this.config.PDF.MARGINS.LEFT, this.yPosition, {
      font: this.helveticaBold,
      size: this.config.PDF.FONT_SIZES.SECTION_TITLE,
      color: this.colors.primary
    });
    this.yPosition -= this.config.PDF.SPACING.SECTION_SPACING;

    const tableHeaders = ['Order #', 'Date', 'Customer', 'Items', 'Total', 'Status'];
    const tableRows = invoices.slice(0, 20).map(invoice => [
      invoice.orderNumber || 'N/A',
      invoice.orderDate || 'N/A',
      invoice.customerInfo?.name || 'N/A',
      invoice.items?.length?.toString() || '0',
      invoice.totals?.total && typeof invoice.totals.total === 'number' ? `$${invoice.totals.total.toFixed(2)}` : 'N/A',
      invoice.validationStatus === 'valid' ? 'Valid' : 'Issues'
    ]);

    this.yPosition = this.drawTable(tableHeaders, tableRows, this.config.PDF.MARGINS.LEFT, this.yPosition, {
      colWidths: this.config.PDF.TABLE_COLUMN_WIDTHS.INVOICE_DETAILS,
      alternateRowColor: true
    });
    this.yPosition -= this.config.PDF.SPACING.TABLE_ROW_SPACING;
  }

  addErrorSection(errors) {
    const EXPORT_CONFIG = require('../../config/export.config');

    if (errors.length === 0) return;

    this.checkPageSpace(80);

    this.drawText('Processing Errors', this.config.PDF.MARGINS.LEFT, this.yPosition, {
      font: this.helveticaBold,
      size: this.config.PDF.FONT_SIZES.SECTION_TITLE,
      color: this.colors.danger
    });
    this.yPosition -= this.config.PDF.SPACING.SECTION_SPACING;

    const errorHeaders = ['File', 'Error'];
    const errorRows = errors.slice(0, 10).map(error => [
      error.filename,
      error.error || 'Unknown error'
    ]);

    this.yPosition = this.drawTable(errorHeaders, errorRows, this.config.PDF.MARGINS.LEFT, this.yPosition, {
      colWidths: this.config.PDF.TABLE_COLUMN_WIDTHS.ERRORS,
      headerColor: this.colors.danger
    });
  }
}

module.exports = PDFReportGenerator;