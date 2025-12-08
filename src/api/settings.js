// API endpoint for user settings management
const fs = require('fs').promises;
const path = require('path');

// Default settings - matching frontend types
const DEFAULT_SETTINGS = {
  parser: {
    defaultRegion: 'us',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    language: 'en',
    validation: {
      strictMode: false,
      confidenceThreshold: 0.8,
    },
  },
  ui: {
    theme: 'system',
    language: 'en',
    itemsPerPage: 25,
    autoRefresh: true,
    showConfidenceScores: false,
    tableDensity: 'comfortable',
  },
  export: {
    defaultFormat: 'json',
    includeValidation: true,
    includeMetadata: true,
    csvDelimiter: ',',
  },
};

// Settings file path
const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

module.exports = (app) => {
  /**
   * GET /api/settings - Get user settings
   */
  app.get('/api/settings', async (req, res) => {
    try {
      let settings;

      try {
        // Try to read settings from file
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        settings = JSON.parse(data);
      } catch (error) {
        // If file doesn't exist or is invalid, use defaults
        settings = DEFAULT_SETTINGS;
        // Create the settings file with defaults
        await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
      }

      res.status(200).json({
        success: true,
        data: settings,
        message: 'Settings retrieved successfully',
      });

    } catch (error) {
      console.error('Settings retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Settings retrieval failed',
        message: error.message,
      });
    }
  });

  /**
   * PUT /api/settings - Update user settings
   */
  app.put('/api/settings', async (req, res) => {
    try {
      const newSettings = req.body;

      if (!newSettings || typeof newSettings !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Invalid settings data',
          message: 'Settings must be a valid object',
        });
      }

      // Validate that required fields are present
      if (!newSettings.parser || !newSettings.ui || !newSettings.export) {
        return res.status(400).json({
          success: false,
          error: 'Invalid settings structure',
          message: 'Settings must contain parser, ui, and export configurations',
        });
      }

      // Ensure settings directory exists
      await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });

      // Write settings to file
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(newSettings, null, 2));

      res.status(200).json({
        success: true,
        data: newSettings,
        message: 'Settings updated successfully',
      });

    } catch (error) {
      console.error('Settings update error:', error);
      res.status(500).json({
        success: false,
        error: 'Settings update failed',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/settings/reset - Reset settings to defaults
   */
  app.post('/api/settings/reset', async (req, res) => {
    try {
      // Ensure settings directory exists
      await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });

      // Write default settings to file
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));

      res.status(200).json({
        success: true,
        data: DEFAULT_SETTINGS,
        message: 'Settings reset to defaults successfully',
      });

    } catch (error) {
      console.error('Settings reset error:', error);
      res.status(500).json({
        success: false,
        error: 'Settings reset failed',
        message: error.message,
      });
    }
  });
};