import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserSettings, ParserSettings, UISettings, ExportSettings } from '@/types';
import { getSettings, updateSettings, resetSettings as resetSettingsApi, syncSettings } from '@/lib/api/settings';

interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  lastSynced: Date | null;

  // Actions
  updateParserSettings: (updates: Partial<ParserSettings>) => void;
  updateUISettings: (updates: Partial<UISettings>) => void;
  updateExportSettings: (updates: Partial<ExportSettings>) => void;
  updateSettings: (updates: Partial<UserSettings>) => void;
  resetSettings: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDirty: (dirty: boolean) => void;

  // Server sync
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<boolean>;
  syncSettings: () => Promise<boolean>;

  // Validation
  validateSettings: () => boolean;
  getValidationErrors: () => Record<string, string[]>;
}

const defaultSettings: UserSettings = {
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
};

// Helper function to ensure settings have valid structure
const validateAndRepairSettings = (settings: any): UserSettings => {
  if (!settings || typeof settings !== 'object') {
    return { ...defaultSettings };
  }

  return {
    parser: {
      defaultRegion: settings.parser?.defaultRegion || defaultSettings.parser.defaultRegion,
      currency: settings.parser?.currency || defaultSettings.parser.currency,
      dateFormat: settings.parser?.dateFormat || defaultSettings.parser.dateFormat,
      language: settings.parser?.language || defaultSettings.parser.language,
      validation: {
        strictMode: settings.parser?.validation?.strictMode ?? defaultSettings.parser.validation.strictMode,
        confidenceThreshold: settings.parser?.validation?.confidenceThreshold ?? defaultSettings.parser.validation.confidenceThreshold,
      },
    },
    ui: {
      theme: settings.ui?.theme || defaultSettings.ui.theme,
      language: settings.ui?.language || defaultSettings.ui.language,
      itemsPerPage: settings.ui?.itemsPerPage || defaultSettings.ui.itemsPerPage,
      autoRefresh: settings.ui?.autoRefresh ?? defaultSettings.ui.autoRefresh,
      showConfidenceScores: settings.ui?.showConfidenceScores ?? defaultSettings.ui.showConfidenceScores,
      tableDensity: settings.ui?.tableDensity || defaultSettings.ui.tableDensity,
    },
    export: {
      defaultFormat: settings.export?.defaultFormat || defaultSettings.export.defaultFormat,
      includeValidation: settings.export?.includeValidation ?? defaultSettings.export.includeValidation,
      includeMetadata: settings.export?.includeMetadata ?? defaultSettings.export.includeMetadata,
      csvDelimiter: settings.export?.csvDelimiter || defaultSettings.export.csvDelimiter,
    },
  };
};


export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isLoading: false,
      error: null,
      isDirty: false,
      lastSynced: null,

      updateParserSettings: (updates: Partial<ParserSettings>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            parser: { ...state.settings.parser, ...updates },
          },
          isDirty: true,
        }));
      },

      updateUISettings: (updates: Partial<UISettings>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ui: { ...state.settings.ui, ...updates },
          },
          isDirty: true,
        }));
      },

      updateExportSettings: (updates: Partial<ExportSettings>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            export: { ...state.settings.export, ...updates },
          },
          isDirty: true,
        }));
      },

      updateSettings: (updates: Partial<UserSettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
          isDirty: true,
        }));
      },

      resetSettings: async () => {
        try {
          const response = await resetSettingsApi();
          if (response.success) {
            set({
              settings: defaultSettings,
              isDirty: false,
              error: null,
              lastSynced: new Date(),
            });
          } else {
            // Reset locally even if server fails
            set({
              settings: defaultSettings,
              isDirty: false,
              error: response.error || 'Failed to reset server settings',
              lastSynced: null,
            });
          }
        } catch (error) {
          // Reset locally on error
          set({
            settings: defaultSettings,
            isDirty: false,
            error: error instanceof Error ? error.message : 'Failed to reset settings',
            lastSynced: null,
          });
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      setDirty: (dirty: boolean) => {
        set({ isDirty: dirty });
      },

      validateSettings: () => {
        const errors = get().getValidationErrors();
        return Object.keys(errors).length === 0;
      },

      loadSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const serverSettings = await getSettings();
          if (serverSettings) {
            set({
              settings: validateAndRepairSettings(serverSettings),
              lastSynced: new Date(),
              isDirty: false,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load settings',
            isLoading: false,
          });
        }
      },

      saveSettings: async () => {
        if (!get().validateSettings()) {
          set({ error: 'Settings validation failed' });
          return false;
        }

        set({ isLoading: true, error: null });
        try {
          const { settings } = get();
          const response = await updateSettings(settings);
          if (response.success) {
            set({
              isDirty: false,
              lastSynced: new Date(),
              isLoading: false,
            });
            return true;
          } else {
            set({
              error: response.error || 'Failed to save settings',
              isLoading: false,
            });
            return false;
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to save settings',
            isLoading: false,
          });
          return false;
        }
      },

      syncSettings: async () => {
        const { settings } = get();
        set({ isLoading: true, error: null });
        try {
          const success = await syncSettings(settings);
          if (success) {
            set({
              lastSynced: new Date(),
              isDirty: false,
              isLoading: false,
            });
          } else {
            set({
              error: 'Failed to sync settings with server',
              isLoading: false,
            });
          }
          return success;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to sync settings',
            isLoading: false,
          });
          return false;
        }
      },

      getValidationErrors: () => {
        const { settings } = get();
        const errors: Record<string, string[]> = {};

        // Ensure settings object exists and has required structure
        if (!settings) {
          errors.general = ['Settings object is missing'];
          return errors;
        }

        // Parser validation
        if (!settings.parser?.defaultRegion) {
          errors.parser = errors.parser || [];
          errors.parser.push('Default region is required');
        }

        if (!settings.parser?.currency) {
          errors.parser = errors.parser || [];
          errors.parser.push('Currency is required');
        }

        if (settings.parser?.validation?.confidenceThreshold !== undefined &&
            (settings.parser.validation.confidenceThreshold < 0 ||
             settings.parser.validation.confidenceThreshold > 1)) {
          errors.parser = errors.parser || [];
          errors.parser.push('Confidence threshold must be between 0 and 1');
        }

        // UI validation
        if (!settings.ui?.theme) {
          errors.ui = errors.ui || [];
          errors.ui.push('Theme is required');
        }

        if (settings.ui?.itemsPerPage !== undefined &&
            ![10, 25, 50, 100].includes(settings.ui.itemsPerPage)) {
          errors.ui = errors.ui || [];
          errors.ui.push('Items per page must be 10, 25, 50, or 100');
        }

        // Export validation
        if (!settings.export?.defaultFormat) {
          errors.export = errors.export || [];
          errors.export.push('Default export format is required');
        }

        if (settings.export?.defaultFormat &&
            !['json', 'csv', 'pdf'].includes(settings.export.defaultFormat)) {
          errors.export = errors.export || [];
          errors.export.push('Export format must be json, csv, or pdf');
        }

        return errors;
      },
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        // Don't persist loading/error/dirty states
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Validate and repair settings when loading from storage
          state.settings = validateAndRepairSettings(state.settings);
        }
      },
    },
  ),
);
