'use client';

import React from 'react';
import { useSettingsStore } from '@/stores';
import { useTheme } from '@/components/theme-provider';
import { UISettings } from '@/types';
import { ValidationErrors } from './settings-validation';

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const;

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: '日本語' },
] as const;

const ITEMS_PER_PAGE = [
  { value: 10, label: '10 items' },
  { value: 25, label: '25 items' },
  { value: 50, label: '50 items' },
  { value: 100, label: '100 items' },
] as const;

const TABLE_DENSITIES = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious', label: 'Spacious' },
] as const;

export function UISettingsTab() {
  const { settings, updateUISettings } = useSettingsStore();
  const { setTheme } = useTheme();

  const handleThemeChange = (theme: UISettings['theme']) => {
    setTheme(theme);
    updateUISettings({ theme });
  };

  const handleLanguageChange = (language: UISettings['language']) => {
    updateUISettings({ language });
  };

  const handleItemsPerPageChange = (itemsPerPage: UISettings['itemsPerPage']) => {
    updateUISettings({ itemsPerPage });
  };

  const handleAutoRefreshChange = (autoRefresh: boolean) => {
    updateUISettings({ autoRefresh });
  };

  const handleShowConfidenceScoresChange = (showConfidenceScores: boolean) => {
    updateUISettings({ showConfidenceScores });
  };

  const handleTableDensityChange = (tableDensity: UISettings['tableDensity']) => {
    updateUISettings({ tableDensity });
  };

  return (
    <div className="space-y-8">
      <ValidationErrors tab="ui" />

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-4">Display Preferences</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Theme */}
          <div>
            <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Theme
            </label>
            <select
              id="theme"
              value={settings.ui.theme}
              onChange={(e) => handleThemeChange(e.target.value as UISettings['theme'])}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              aria-describedby="theme-description"
            >
              {THEMES.map((theme) => (
                <option key={theme.value} value={theme.value}>
                  {theme.label}
                </option>
              ))}
            </select>
            <p id="theme-description" className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
              Choose your preferred color theme
            </p>
          </div>

          {/* Language */}
          <div>
            <label htmlFor="ui-language" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Interface Language
            </label>
            <select
              id="ui-language"
              value={settings.ui.language}
              onChange={(e) => handleLanguageChange(e.target.value as UISettings['language'])}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              aria-describedby="ui-language-description"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            <p id="ui-language-description" className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
              Language for the user interface
            </p>
          </div>

          {/* Items Per Page */}
          <div>
            <label htmlFor="items-per-page" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Items Per Page
            </label>
            <select
              id="items-per-page"
              value={settings.ui.itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value) as UISettings['itemsPerPage'])}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              aria-describedby="items-per-page-description"
            >
              {ITEMS_PER_PAGE.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p id="items-per-page-description" className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
              Number of items to display per page in tables
            </p>
          </div>

          {/* Table Density */}
          <div>
            <label htmlFor="table-density" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Table Density
            </label>
            <select
              id="table-density"
              value={settings.ui.tableDensity}
              onChange={(e) => handleTableDensityChange(e.target.value as UISettings['tableDensity'])}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              aria-describedby="table-density-description"
            >
              {TABLE_DENSITIES.map((density) => (
                <option key={density.value} value={density.value}>
                  {density.label}
                </option>
              ))}
            </select>
            <p id="table-density-description" className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
              Spacing and layout density for data tables
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-4">Behavior Settings</h3>
        <div className="space-y-4">
          {/* Auto Refresh */}
          <div className="flex items-center">
            <input
              id="auto-refresh"
              type="checkbox"
              checked={settings.ui.autoRefresh}
              onChange={(e) => handleAutoRefreshChange(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 rounded"
            />
            <label htmlFor="auto-refresh" className="ml-2 block text-sm text-gray-900 dark:text-neutral-100">
              Auto-refresh processing status
            </label>
          </div>
          <p className="text-sm text-gray-500 dark:text-neutral-400 ml-6">
            Automatically update processing status without manual refresh
          </p>

          {/* Show Confidence Scores */}
          <div className="flex items-center">
            <input
              id="show-confidence"
              type="checkbox"
              checked={settings.ui.showConfidenceScores}
              onChange={(e) => handleShowConfidenceScoresChange(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 rounded"
            />
            <label htmlFor="show-confidence" className="ml-2 block text-sm text-gray-900 dark:text-neutral-100">
              Show confidence scores in results
            </label>
          </div>
          <p className="text-sm text-gray-500 dark:text-neutral-400 ml-6">
            Display confidence scores for extracted data fields
          </p>
        </div>
      </div>
    </div>
  );
}