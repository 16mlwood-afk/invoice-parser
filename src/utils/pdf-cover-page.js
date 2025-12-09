/**
 * PDF Cover Page Generator for professional report styling
 * Creates branded cover pages with logos, metadata, and executive summaries
 */

const fs = require('fs').promises;
const path = require('path');

class PDFCoverPageGenerator {
  /**
   * @param {PDFThemeEngine} themeEngine - Theme engine instance
   * @param {Object} pdfDoc - pdf-lib PDFDocument instance
   * @param {Object} fonts - Embedded fonts object { helvetica, helveticaBold }
   */
  constructor(themeEngine, pdfDoc, fonts = {}) {
    this.themeEngine = themeEngine;
    this.pdfDoc = pdfDoc;
    this.fonts = fonts;
    this.pageWidth = 595;  // A4 width in points
    this.pageHeight = 842; // A4 height in points

    // Fallback font embedding if not provided
    this._ensureFonts();
  }

  async _ensureFonts() {
    if (!this.fonts.helvetica) {
      const { StandardFonts } = require('pdf-lib');
      this.fonts.helvetica = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
    }
    if (!this.fonts.helveticaBold) {
      const { StandardFonts } = require('pdf-lib');
      this.fonts.helveticaBold = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }
  }

  /**
   * Generate and add a cover page to the PDF
   * @param {Object} reportData - Report metadata and summary data
   * @param {string} template - Report template type
   * @returns {Promise<Object>} The created cover page
   */
  async generateCoverPage(reportData, template = 'detailed') {
    const page = this.pdfDoc.addPage();
    const { width, height } = page.getSize();

    // Get theme colors and fonts
    const primaryColor = this.themeEngine.getPDFColor('primary');
    const textColor = this.themeEngine.getPDFColor('text');
    const backgroundColor = this.themeEngine.getPDFColor('background');

    // Load fonts
    const helveticaBold = await this.pdfDoc.embedFont('Helvetica-Bold');
    const helvetica = await this.pdfDoc.embedFont('Helvetica');

    // Fill background
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: backgroundColor,
    });

    let yPosition = height - 80; // Start near top with margin

    // Add company logo if available
    yPosition = await this.addLogo(page, yPosition);

    // Add report title
    yPosition = this.addReportTitle(page, reportData, helveticaBold, primaryColor, yPosition);

    // Add metadata section
    yPosition = this.addMetadataSection(page, reportData, helvetica, textColor, yPosition);

    // Add executive summary for detailed reports
    if (template === 'detailed') {
      yPosition = this.addExecutiveSummary(page, reportData, helvetica, textColor, yPosition);
    }

    // Add footer with generation info
    this.addCoverFooter(page, reportData, helvetica, textColor);

    return page;
  }

  /**
   * Add company logo to the cover page
   * @param {Object} page - PDF page
   * @param {number} yPosition - Current Y position
   * @returns {Promise<number>} Updated Y position
   */
  async addLogo(page, yPosition) {
    try {
      const logoExists = await this.themeEngine.logoExists();
      if (logoExists) {
        const branding = this.themeEngine.getBranding();
        const logoPath = branding.logoPath;

        // Read logo file
        const logoBytes = await fs.readFile(logoPath);

        // Determine image type and embed
        let logoImage;
        const fileExtension = path.extname(logoPath).toLowerCase();

        if (fileExtension === '.png') {
          logoImage = await this.pdfDoc.embedPng(logoBytes);
        } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
          logoImage = await this.pdfDoc.embedJpg(logoBytes);
        } else {
          // Fallback to text-only branding
          return this.addTextLogo(page, yPosition);
        }

        // Calculate logo dimensions (max 200x100, maintain aspect ratio)
        const { width: imgWidth, height: imgHeight } = logoImage;
        const maxWidth = 200;
        const maxHeight = 100;

        let scaledWidth = imgWidth;
        let scaledHeight = imgHeight;

        // Scale down if too large
        if (scaledWidth > maxWidth) {
          const ratio = maxWidth / scaledWidth;
          scaledWidth = maxWidth;
          scaledHeight *= ratio;
        }

        if (scaledHeight > maxHeight) {
          const ratio = maxHeight / scaledHeight;
          scaledHeight = maxHeight;
          scaledWidth *= ratio;
        }

        // Center logo horizontally
        const xPosition = (this.pageWidth - scaledWidth) / 2;

        // Draw logo
        page.drawImage(logoImage, {
          x: xPosition,
          y: yPosition - scaledHeight,
          width: scaledWidth,
          height: scaledHeight,
        });

        return yPosition - scaledHeight - 40; // Return position below logo
      } else {
        // Fallback to text logo
        return this.addTextLogo(page, yPosition);
      }
    } catch (error) {
      console.warn('Failed to load logo, using text branding:', error.message);
      return this.addTextLogo(page, yPosition);
    }
  }

  /**
   * Add text-based company branding when logo is not available
   * @param {Object} page - PDF page
   * @param {number} yPosition - Current Y position
   * @returns {number} Updated Y position
   */
  addTextLogo(page, yPosition) {
    const branding = this.themeEngine.getBranding();
    const helveticaBold = this.pdfDoc.getFont('Helvetica-Bold');
    const primaryColor = this.themeEngine.getPDFColor('primary');

    // Draw company name as text logo
    page.drawText(branding.companyName, {
      x: this.pageWidth / 2 - this.fonts.helveticaBold.widthOfTextAtSize(branding.companyName, 28) / 2,
      y: yPosition - 35,
      size: 28,
      font: this.fonts.helveticaBold,
      color: primaryColor,
    });

    return yPosition - 80; // Return position below text logo
  }

  /**
   * Add report title to cover page
   * @param {Object} page - PDF page
   * @param {Object} reportData - Report data
   * @param {Object} font - Font to use
   * @param {Object} color - Text color
   * @param {number} yPosition - Current Y position
   * @returns {number} Updated Y position
   */
  addReportTitle(page, reportData, font, color, yPosition) {
    const title = 'Invoice Processing Report';
    const titleSize = this.themeEngine.getFontSize('h1');

    page.drawText(title, {
      x: this.pageWidth / 2 - font.widthOfTextAtSize(title, titleSize) / 2,
      y: yPosition,
      size: titleSize,
      font,
      color,
    });

    return yPosition - titleSize - 20;
  }

  /**
   * Add metadata section to cover page
   * @param {Object} page - PDF page
   * @param {Object} reportData - Report data
   * @param {Object} font - Font to use
   * @param {Object} color - Text color
   * @param {number} yPosition - Current Y position
   * @returns {number} Updated Y position
   */
  addMetadataSection(page, reportData, font, color, yPosition) {
    const bodySize = this.themeEngine.getFontSize('body');
    const leftMargin = 100;
    const lineHeight = bodySize * this.themeEngine.getLineHeight('normal');

    // Job ID
    const jobId = reportData.jobId || 'N/A';
    page.drawText(`Job ID: ${jobId}`, {
      x: leftMargin,
      y: yPosition,
      size: bodySize,
      font,
      color,
    });

    // Generation Date
    const generatedDate = new Date().toLocaleDateString();
    page.drawText(`Generated: ${generatedDate}`, {
      x: leftMargin,
      y: yPosition - lineHeight,
      size: bodySize,
      font,
      color,
    });

    // Date Range (if available)
    if (reportData.dateRange) {
      page.drawText(`Period: ${reportData.dateRange}`, {
        x: leftMargin,
        y: yPosition - (lineHeight * 2),
        size: bodySize,
        font,
        color,
      });
      return yPosition - (lineHeight * 3) - 20;
    }

    return yPosition - (lineHeight * 2) - 20;
  }

  /**
   * Add executive summary to cover page
   * @param {Object} page - PDF page
   * @param {Object} reportData - Report data
   * @param {Object} font - Font to use
   * @param {Object} color - Text color
   * @param {number} yPosition - Current Y position
   * @returns {number} Updated Y position
   */
  addExecutiveSummary(page, reportData, font, color, yPosition) {
    const h2Size = this.themeEngine.getFontSize('h2');
    const bodySize = this.themeEngine.getFontSize('body');
    const leftMargin = 80;
    const lineHeight = bodySize * this.themeEngine.getLineHeight('normal');

    // Section title
    page.drawText('Executive Summary', {
      x: leftMargin,
      y: yPosition,
      size: h2Size,
      font: this.fonts.helveticaBold,
      color: this.themeEngine.getPDFColor('primary'),
    });

    let currentY = yPosition - h2Size - 15;

    // Generate summary text based on report data
    const summary = this.generateExecutiveSummary(reportData);

    // Split summary into lines that fit the page width
    const maxWidth = this.pageWidth - (leftMargin * 2);
    const lines = this.wrapText(summary, font, bodySize, maxWidth);

    // Draw summary lines
    for (const line of lines) {
      if (currentY < 100) break; // Don't go too low on page

      page.drawText(line, {
        x: leftMargin,
        y: currentY,
        size: bodySize,
        font,
        color,
      });

      currentY -= lineHeight;
    }

    return Math.max(currentY, 120); // Leave space for footer
  }

  /**
   * Add footer to cover page
   * @param {Object} page - PDF page
   * @param {Object} reportData - Report data
   * @param {Object} font - Font to use
   * @param {Object} color - Text color
   */
  addCoverFooter(page, reportData, font, color) {
    const bodySize = this.themeEngine.getFontSize('caption');
    const footerY = 40;

    // Left: Generation info
    const leftText = `Generated by ${this.themeEngine.getBranding().companyName}`;
    page.drawText(leftText, {
      x: 50,
      y: footerY,
      size: bodySize,
      font,
      color: this.themeEngine.getPDFColor('textLight'),
    });

    // Center: Confidentiality
    const centerText = 'Confidential - For Internal Use Only';
    const centerX = this.pageWidth / 2 - font.widthOfTextAtSize(centerText, bodySize) / 2;
    page.drawText(centerText, {
      x: centerX,
      y: footerY,
      size: bodySize,
      font,
      color: this.themeEngine.getPDFColor('textLight'),
    });

    // Right: Page number
    const rightText = 'Page 1';
    const rightX = this.pageWidth - 50 - font.widthOfTextAtSize(rightText, bodySize);
    page.drawText(rightText, {
      x: rightX,
      y: footerY,
      size: bodySize,
      font,
      color: this.themeEngine.getPDFColor('textLight'),
    });
  }

  /**
   * Generate executive summary text from report data
   * @param {Object} reportData - Report data
   * @returns {string} Summary text
   */
  generateExecutiveSummary(reportData) {
    const summary = reportData.summary || {};
    const totalInvoices = summary.totalInvoices || 0;
    const totalSpent = summary.totalSpent || 0;
    const successful = summary.successful || 0;
    const failed = summary.failed || 0;

    let summaryText = `This report analyzes ${totalInvoices} invoice${totalInvoices !== 1 ? 's' : ''}`;

    if (totalSpent > 0) {
      summaryText += ` with a total value of ${this.formatCurrency(totalSpent)}.`;
    } else {
      summaryText += '.';
    }

    if (successful > 0 && failed > 0) {
      const successRate = Math.round((successful / (successful + failed)) * 100);
      summaryText += ` Processing was ${successRate}% successful with ${successful} invoices processed successfully and ${failed} requiring attention.`;
    } else if (successful > 0) {
      summaryText += ' All invoices were processed successfully.';
    }

    return summaryText;
  }

  /**
   * Format currency value for display
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  /**
   * Wrap text to fit within specified width
   * @param {string} text - Text to wrap
   * @param {Object} font - Font object
   * @param {number} fontSize - Font size
   * @param {number} maxWidth - Maximum width in points
   * @returns {Array<string>} Array of wrapped lines
   */
  wrapText(text, font, fontSize, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}

module.exports = PDFCoverPageGenerator;