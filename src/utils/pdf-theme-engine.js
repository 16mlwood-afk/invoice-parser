/**
 * PDF Theme Engine for professional report styling
 * Manages colors, typography, spacing, and branding for PDF reports
 */

const fs = require('fs').promises;
const path = require('path');
const { rgb } = require('pdf-lib');

class PDFThemeEngine {
  constructor(themeConfig = null) {
    this.theme = themeConfig || this.getDefaultTheme();
    this.validateTheme();
  }

  /**
   * Get the default professional theme configuration
   * @returns {Object} Default theme configuration
   */
  getDefaultTheme() {
    return {
      branding: {
        companyName: 'Invoice Parser Pro',
        logoPath: path.join(__dirname, '../assets/download.jpeg'),
        primaryColor: [0.2, 0.4, 0.8],     // Blue
        secondaryColor: [0.9, 0.9, 0.9],   // Light gray
        accentColor: [0.1, 0.6, 0.3],      // Green
      },
      typography: {
        fontFamily: {
          heading: 'Helvetica-Bold',
          body: 'Helvetica',
          monospace: 'Courier',
        },
        sizes: {
          h1: 24,
          h2: 18,
          h3: 14,
          body: 11,
          caption: 9,
        },
        lineHeight: {
          tight: 1.2,
          normal: 1.4,
          loose: 1.6,
        },
      },
      layout: {
        margins: { top: 50, right: 50, bottom: 50, left: 50 },
        sectionSpacing: 30,
        paragraphSpacing: 8,
      },
      colors: {
        primary: [0.2, 0.4, 0.8],     // Blue
        secondary: [0.9, 0.9, 0.9],   // Light gray
        accent: [0.1, 0.6, 0.3],      // Green
        success: [0.1, 0.6, 0.3],     // Green
        warning: [0.8, 0.6, 0.1],     // Orange
        danger: [0.8, 0.2, 0.2],      // Red
        processing: [0.2, 0.5, 0.9],  // Blue
        text: [0.1, 0.1, 0.1],        // Dark gray
        textLight: [0.5, 0.5, 0.5],   // Medium gray
        background: [1.0, 1.0, 1.0],  // White
      },
    };
  }

  /**
   * Load theme from configuration file
   * @param {string} themePath - Path to theme configuration file
   * @returns {Promise<PDFThemeEngine>} Theme engine instance
   */
  static async loadFromFile(themePath) {
    try {
      const themeData = await fs.readFile(themePath, 'utf8');
      const themeConfig = JSON.parse(themeData);
      return new PDFThemeEngine(themeConfig);
    } catch (error) {
      console.warn(`Failed to load theme from ${themePath}, using default theme:`, error.message);
      return new PDFThemeEngine();
    }
  }

  /**
   * Validate theme configuration structure
   * @throws {Error} If theme is invalid
   */
  validateTheme() {
    const requiredSections = ['branding', 'typography', 'layout', 'colors'];
    const requiredColors = ['primary', 'secondary', 'accent', 'success', 'warning', 'danger', 'text', 'background'];

    // Check required sections
    for (const section of requiredSections) {
      if (!this.theme[section]) {
        throw new Error(`Theme validation failed: missing required section '${section}'`);
      }
    }

    // Check required colors
    for (const color of requiredColors) {
      if (!this.theme.colors[color] || !Array.isArray(this.theme.colors[color]) || this.theme.colors[color].length !== 3) {
        throw new Error(`Theme validation failed: invalid color '${color}' - must be RGB array [r, g, b]`);
      }
    }

    // Check typography sizes
    const requiredSizes = ['h1', 'h2', 'h3', 'body', 'caption'];
    for (const size of requiredSizes) {
      if (typeof this.theme.typography.sizes[size] !== 'number' || this.theme.typography.sizes[size] <= 0) {
        throw new Error(`Theme validation failed: invalid font size for '${size}'`);
      }
    }

    // Validate RGB values are between 0 and 1
    for (const [colorName, rgbValues] of Object.entries(this.theme.colors)) {
      for (const value of rgbValues) {
        if (typeof value !== 'number' || value < 0 || value > 1) {
          throw new Error(`Theme validation failed: color '${colorName}' has invalid RGB value ${value} - must be between 0 and 1`);
        }
      }
    }
  }

  /**
   * Get RGB color values for a named color
   * @param {string} colorName - Name of the color
   * @returns {Array} RGB values as [r, g, b]
   */
  getColor(colorName) {
    const color = this.theme.colors[colorName];
    if (!color) {
      throw new Error(`Unknown color '${colorName}'`);
    }
    return color;
  }

  /**
   * Get RGB color object for pdf-lib
   * @param {string} colorName - Name of the color
   * @returns {Object} pdf-lib RGB color object
   */
  getPDFColor(colorName) {
    const rgbValues = this.getColor(colorName);
    return rgb(rgbValues[0], rgbValues[1], rgbValues[2]);
  }

  /**
   * Get font size for a typography level
   * @param {string} level - Typography level (h1, h2, h3, body, caption)
   * @returns {number} Font size in points
   */
  getFontSize(level) {
    const size = this.theme.typography.sizes[level];
    if (!size) {
      throw new Error(`Unknown typography level '${level}'`);
    }
    return size;
  }

  /**
   * Get line height multiplier
   * @param {string} spacing - Line height type (tight, normal, loose)
   * @returns {number} Line height multiplier
   */
  getLineHeight(spacing = 'normal') {
    const height = this.theme.typography.lineHeight[spacing];
    if (!height) {
      throw new Error(`Unknown line height '${spacing}'`);
    }
    return height;
  }

  /**
   * Get layout margins
   * @returns {Object} Margin values { top, right, bottom, left }
   */
  getMargins() {
    return this.theme.layout.margins;
  }

  /**
   * Get section spacing
   * @returns {number} Spacing between sections in points
   */
  getSectionSpacing() {
    return this.theme.layout.sectionSpacing;
  }

  /**
   * Get paragraph spacing
   * @returns {number} Spacing between paragraphs in points
   */
  getParagraphSpacing() {
    return this.theme.layout.paragraphSpacing;
  }

  /**
   * Get branding information
   * @returns {Object} Branding configuration
   */
  getBranding() {
    return this.theme.branding;
  }

  /**
   * Get typography configuration
   * @returns {Object} Typography configuration
   */
  getTypography() {
    return this.theme.typography;
  }

  /**
   * Check if logo file exists
   * @returns {Promise<boolean>} True if logo exists
   */
  async logoExists() {
    try {
      await fs.access(this.theme.branding.logoPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get status indicator symbol and color for a status
   * @param {string} status - Status type (success, warning, danger, processing)
   * @returns {Object} { symbol, color }
   */
  getStatusIndicator(status) {
    const indicators = {
      success: { symbol: '✓', color: 'success' },
      warning: { symbol: '⚠', color: 'warning' },
      danger: { symbol: '✗', color: 'danger' },
      processing: { symbol: '⟳', color: 'processing' },
    };

    return indicators[status] || { symbol: '?', color: 'text' };
  }
}

module.exports = PDFThemeEngine;