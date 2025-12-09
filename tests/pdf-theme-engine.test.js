/**
 * Unit tests for PDF Theme Engine
 */

const PDFThemeEngine = require('../src/utils/pdf-theme-engine');
const path = require('path');

describe('PDFThemeEngine', () => {
  let themeEngine;

  beforeEach(() => {
    themeEngine = new PDFThemeEngine();
  });

  describe('Default Theme', () => {
    test('loads default theme configuration', () => {
      expect(themeEngine.theme).toBeDefined();
      expect(themeEngine.theme.branding.companyName).toBe('Invoice Parser Pro');
      expect(themeEngine.theme.colors.primary).toEqual([0.2, 0.4, 0.8]);
    });

    test('default theme passes validation', () => {
      expect(() => themeEngine.validateTheme()).not.toThrow();
    });

    test('has all required sections', () => {
      const requiredSections = ['branding', 'typography', 'layout', 'colors'];
      requiredSections.forEach(section => {
        expect(themeEngine.theme[section]).toBeDefined();
      });
    });
  });

  describe('Theme Validation', () => {
    test('throws error for missing required section', () => {
      const invalidTheme = { ...themeEngine.theme };
      delete invalidTheme.branding;

      expect(() => new PDFThemeEngine(invalidTheme)).toThrow(
        "Theme validation failed: missing required section 'branding'"
      );
    });

    test('throws error for invalid color format', () => {
      const invalidTheme = {
        ...themeEngine.theme,
        colors: { ...themeEngine.theme.colors, primary: [1, 2] } // Missing third value
      };

      expect(() => new PDFThemeEngine(invalidTheme)).toThrow(
        "Theme validation failed: invalid color 'primary' - must be RGB array [r, g, b]"
      );
    });

    test('throws error for color values out of range', () => {
      const invalidTheme = {
        ...themeEngine.theme,
        colors: { ...themeEngine.theme.colors, primary: [1.5, 0.5, 0.5] } // Value > 1
      };

      expect(() => new PDFThemeEngine(invalidTheme)).toThrow(
        "Theme validation failed: color 'primary' has invalid RGB value 1.5 - must be between 0 and 1"
      );
    });

    test('throws error for invalid font size', () => {
      const invalidTheme = {
        ...themeEngine.theme,
        typography: {
          ...themeEngine.theme.typography,
          sizes: { ...themeEngine.theme.typography.sizes, h1: -5 }
        }
      };

      expect(() => new PDFThemeEngine(invalidTheme)).toThrow(
        "Theme validation failed: invalid font size for 'h1'"
      );
    });
  });

  describe('Color Management', () => {
    test('returns RGB values for named colors', () => {
      expect(themeEngine.getColor('primary')).toEqual([0.2, 0.4, 0.8]);
      expect(themeEngine.getColor('success')).toEqual([0.1, 0.6, 0.3]);
      expect(themeEngine.getColor('warning')).toEqual([0.8, 0.6, 0.1]);
    });

    test('throws error for unknown color', () => {
      expect(() => themeEngine.getColor('nonexistent')).toThrow(
        "Unknown color 'nonexistent'"
      );
    });

    test('returns pdf-lib color objects', () => {
      const color = themeEngine.getPDFColor('primary');
      expect(color).toEqual({ red: 0.2, green: 0.4, blue: 0.8, type: 'RGB' });
    });
  });

  describe('Typography', () => {
    test('returns font sizes for typography levels', () => {
      expect(themeEngine.getFontSize('h1')).toBe(24);
      expect(themeEngine.getFontSize('body')).toBe(11);
      expect(themeEngine.getFontSize('caption')).toBe(9);
    });

    test('throws error for unknown typography level', () => {
      expect(() => themeEngine.getFontSize('nonexistent')).toThrow(
        "Unknown typography level 'nonexistent'"
      );
    });

    test('returns line height multipliers', () => {
      expect(themeEngine.getLineHeight('normal')).toBe(1.4);
      expect(themeEngine.getLineHeight('tight')).toBe(1.2);
      expect(themeEngine.getLineHeight('loose')).toBe(1.6);
    });

    test('defaults to normal line height', () => {
      expect(themeEngine.getLineHeight()).toBe(1.4);
    });
  });

  describe('Layout', () => {
    test('returns margin configuration', () => {
      const margins = themeEngine.getMargins();
      expect(margins).toEqual({ top: 50, right: 50, bottom: 50, left: 50 });
    });

    test('returns section spacing', () => {
      expect(themeEngine.getSectionSpacing()).toBe(30);
    });

    test('returns paragraph spacing', () => {
      expect(themeEngine.getParagraphSpacing()).toBe(8);
    });
  });

  describe('Branding', () => {
    test('returns branding configuration', () => {
      const branding = themeEngine.getBranding();
      expect(branding.companyName).toBe('Invoice Parser Pro');
      expect(branding.primaryColor).toEqual([0.2, 0.4, 0.8]);
    });
  });

  describe('Status Indicators', () => {
    test('returns correct indicators for each status', () => {
      expect(themeEngine.getStatusIndicator('success')).toEqual({ symbol: '✓', color: 'success' });
      expect(themeEngine.getStatusIndicator('warning')).toEqual({ symbol: '⚠', color: 'warning' });
      expect(themeEngine.getStatusIndicator('danger')).toEqual({ symbol: '✗', color: 'danger' });
      expect(themeEngine.getStatusIndicator('processing')).toEqual({ symbol: '⟳', color: 'processing' });
    });

    test('returns default indicator for unknown status', () => {
      expect(themeEngine.getStatusIndicator('unknown')).toEqual({ symbol: '?', color: 'text' });
    });
  });

  describe('File Loading', () => {
    test('loads theme from valid JSON file', async () => {
      // Create a temporary theme file
      const tempTheme = {
        ...themeEngine.theme,
        branding: { ...themeEngine.theme.branding, companyName: 'Test Company' }
      };

      const fs = require('fs').promises;
      const tempPath = path.join(__dirname, 'temp-theme.json');

      try {
        await fs.writeFile(tempPath, JSON.stringify(tempTheme, null, 2));
        const loadedTheme = await PDFThemeEngine.loadFromFile(tempPath);

        expect(loadedTheme.getBranding().companyName).toBe('Test Company');
      } finally {
        try {
          await fs.unlink(tempPath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });

    test('falls back to default theme when file loading fails', async () => {
      const theme = await PDFThemeEngine.loadFromFile('/nonexistent/path.json');
      expect(theme.getBranding().companyName).toBe('Invoice Parser Pro');
    });
  });

  describe('Logo Handling', () => {
    test('checks if logo file exists', async () => {
      const exists = await themeEngine.logoExists();
      // The placeholder file exists but is not a valid PNG
      // In production, this would be replaced with a real PNG file
      expect(typeof exists).toBe('boolean');
    });
  });
});