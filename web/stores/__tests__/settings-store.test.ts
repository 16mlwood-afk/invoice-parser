import { act, renderHook } from '@testing-library/react';
import { useSettingsStore } from '../settings-store';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock the API
jest.mock('@/lib/api/settings', () => ({
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
  resetSettings: jest.fn(),
  syncSettings: jest.fn(),
}));

import { getSettings, updateSettings, resetSettings, syncSettings } from '@/lib/api/settings';

const mockGetSettings = getSettings as jest.MockedFunction<typeof getSettings>;
const mockUpdateSettings = updateSettings as jest.MockedFunction<typeof updateSettings>;
const mockResetSettings = resetSettings as jest.MockedFunction<typeof resetSettings>;
const mockSyncSettings = syncSettings as jest.MockedFunction<typeof syncSettings>;

describe('Settings Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    // Reset the store before each test
    const { result } = renderHook(() => useSettingsStore());
    act(() => {
      result.current.resetSettings();
    });
  });

  describe('Initial State', () => {
    it('should have correct default settings', () => {
      const { result } = renderHook(() => useSettingsStore());

      expect(result.current.settings).toEqual({
        parser: {
          defaultRegion: 'us',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          language: 'en',
          validation: {
            strictMode: false,
            confidenceThreshold: 0.7,
          },
        },
        ui: {
          theme: 'system',
          language: 'en',
          itemsPerPage: 25,
          autoRefresh: true,
          showConfidenceScores: true,
          tableDensity: 'comfortable',
        },
        export: {
          defaultFormat: 'json',
          includeValidation: true,
          includeMetadata: true,
          csvDelimiter: ',',
        },
      });
    });

    it('should not be loading initially', () => {
      const { result } = renderHook(() => useSettingsStore());
      expect(result.current.isLoading).toBe(false);
    });

    it('should not have errors initially', () => {
      const { result } = renderHook(() => useSettingsStore());
      expect(result.current.error).toBe(null);
    });

    it('should not be dirty initially', () => {
      const { result } = renderHook(() => useSettingsStore());
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('Parser Settings Updates', () => {
    it('should update parser region', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateParserSettings({ defaultRegion: 'eu' });
      });

      expect(result.current.settings.parser.defaultRegion).toBe('eu');
      expect(result.current.isDirty).toBe(true);
    });

    it('should update parser currency', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateParserSettings({ currency: 'EUR' });
      });

      expect(result.current.settings.parser.currency).toBe('EUR');
      expect(result.current.isDirty).toBe(true);
    });

    it('should update validation settings', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateParserSettings({
          validation: {
            strictMode: true,
            confidenceThreshold: 0.8,
          },
        });
      });

      expect(result.current.settings.parser.validation.strictMode).toBe(true);
      expect(result.current.settings.parser.validation.confidenceThreshold).toBe(0.8);
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('UI Settings Updates', () => {
    it('should update theme', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateUISettings({ theme: 'dark' });
      });

      expect(result.current.settings.ui.theme).toBe('dark');
      expect(result.current.isDirty).toBe(true);
    });

    it('should update items per page', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateUISettings({ itemsPerPage: 50 });
      });

      expect(result.current.settings.ui.itemsPerPage).toBe(50);
      expect(result.current.isDirty).toBe(true);
    });

    it('should update table density', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateUISettings({ tableDensity: 'compact' });
      });

      expect(result.current.settings.ui.tableDensity).toBe('compact');
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('Export Settings Updates', () => {
    it('should update default format', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateExportSettings({ defaultFormat: 'csv' });
      });

      expect(result.current.settings.export.defaultFormat).toBe('csv');
      expect(result.current.isDirty).toBe(true);
    });

    it('should update CSV delimiter', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateExportSettings({ csvDelimiter: ';' });
      });

      expect(result.current.settings.export.csvDelimiter).toBe(';');
      expect(result.current.isDirty).toBe(true);
    });

    it('should update include options', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateExportSettings({
          includeValidation: false,
          includeMetadata: false,
        });
      });

      expect(result.current.settings.export.includeValidation).toBe(false);
      expect(result.current.settings.export.includeMetadata).toBe(false);
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate correct settings', () => {
      const { result } = renderHook(() => useSettingsStore());

      const isValid = result.current.validateSettings();
      expect(isValid).toBe(true);
    });

    it('should detect invalid region', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateParserSettings({ defaultRegion: '' as any });
      });

      const isValid = result.current.validateSettings();
      expect(isValid).toBe(false);

      const errors = result.current.getValidationErrors();
      expect(errors.parser).toContain('Default region is required');
    });

    it('should detect invalid currency', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateParserSettings({ currency: '' as any });
      });

      const isValid = result.current.validateSettings();
      expect(isValid).toBe(false);

      const errors = result.current.getValidationErrors();
      expect(errors.parser).toContain('Currency is required');
    });

    it('should detect invalid confidence threshold', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateParserSettings({
          validation: {
            ...result.current.settings.parser.validation,
            confidenceThreshold: 1.5,
          },
        });
      });

      const isValid = result.current.validateSettings();
      expect(isValid).toBe(false);

      const errors = result.current.getValidationErrors();
      expect(errors.parser).toContain('Confidence threshold must be between 0 and 1');
    });

    it('should detect invalid theme', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateUISettings({ theme: '' as any });
      });

      const isValid = result.current.validateSettings();
      expect(isValid).toBe(false);

      const errors = result.current.getValidationErrors();
      expect(errors.ui).toContain('Theme is required');
    });

    it('should detect invalid items per page', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateUISettings({ itemsPerPage: 99 as any });
      });

      const isValid = result.current.validateSettings();
      expect(isValid).toBe(false);

      const errors = result.current.getValidationErrors();
      expect(errors.ui).toContain('Items per page must be 10, 25, 50, or 100');
    });

    it('should detect invalid export format', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateExportSettings({ defaultFormat: '' as any });
      });

      const isValid = result.current.validateSettings();
      expect(isValid).toBe(false);

      const errors = result.current.getValidationErrors();
      expect(errors.export).toContain('Default export format is required');
    });
  });

  describe('Reset Settings', () => {
    it('should reset settings to defaults', async () => {
      const { result } = renderHook(() => useSettingsStore());

      // Make some changes
      act(() => {
        result.current.updateParserSettings({ defaultRegion: 'eu' });
        result.current.updateUISettings({ theme: 'dark' });
      });

      // Mock successful reset
      mockResetSettings.mockResolvedValue({ success: true });

      // Reset settings
      await act(async () => {
        result.current.resetSettings();
      });

      expect(result.current.settings.parser.defaultRegion).toBe('us');
      expect(result.current.settings.ui.theme).toBe('system');
      expect(result.current.isDirty).toBe(false);
    });

    it('should handle reset API failure gracefully', async () => {
      const { result } = renderHook(() => useSettingsStore());

      // Make some changes
      act(() => {
        result.current.updateParserSettings({ defaultRegion: 'eu' });
      });

      // Mock failed reset
      mockResetSettings.mockResolvedValue({
        success: false,
        error: 'Server error'
      });

      // Reset settings
      await act(async () => {
        result.current.resetSettings();
      });

      // Should still reset locally
      expect(result.current.settings.parser.defaultRegion).toBe('us');
      expect(result.current.error).toBe('Server error');
    });
  });

  describe('Server Sync', () => {
    it('should load settings from server', async () => {
      const { result } = renderHook(() => useSettingsStore());

      const serverSettings = {
        parser: { defaultRegion: 'eu' },
        ui: { theme: 'dark' },
        export: { defaultFormat: 'csv' },
      };

      mockGetSettings.mockResolvedValue(serverSettings);

      await act(async () => {
        result.current.loadSettings();
      });

      expect(result.current.settings).toEqual(serverSettings);
      expect(result.current.isDirty).toBe(false);
    });

    it('should save settings to server', async () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateParserSettings({ defaultRegion: 'eu' });
      });

      mockUpdateSettings.mockResolvedValue({ success: true });

      let success: boolean;
      await act(async () => {
        success = await result.current.saveSettings();
      });

      expect(success).toBe(true);
      expect(result.current.isDirty).toBe(false);
      expect(mockUpdateSettings).toHaveBeenCalledWith(result.current.settings);
    });

    it('should handle save validation failure', async () => {
      const { result } = renderHook(() => useSettingsStore());

      // Make invalid changes
      act(() => {
        result.current.updateParserSettings({ defaultRegion: '' as any });
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.saveSettings();
      });

      expect(success).toBe(false);
      expect(result.current.isDirty).toBe(true);
      expect(mockUpdateSettings).not.toHaveBeenCalled();
    });

    it('should sync settings with server', async () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateParserSettings({ defaultRegion: 'eu' });
      });

      mockSyncSettings.mockResolvedValue(true);

      let success: boolean;
      await act(async () => {
        success = await result.current.syncSettings();
      });

      expect(success).toBe(true);
      expect(result.current.isDirty).toBe(false);
      expect(mockSyncSettings).toHaveBeenCalledWith(result.current.settings);
    });
  });

  describe('Local Storage Persistence', () => {
    it('should persist settings to localStorage', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updateParserSettings({ defaultRegion: 'eu' });
      });

      // The persist middleware should save to localStorage
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should restore settings from localStorage', () => {
      const storedSettings = {
        parser: { defaultRegion: 'eu' },
        ui: { theme: 'dark' },
        export: { defaultFormat: 'csv' },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedSettings));

      const { result } = renderHook(() => useSettingsStore());

      expect(result.current.settings.parser.defaultRegion).toBe('eu');
      expect(result.current.settings.ui.theme).toBe('dark');
      expect(result.current.settings.export.defaultFormat).toBe('csv');
    });
  });
});