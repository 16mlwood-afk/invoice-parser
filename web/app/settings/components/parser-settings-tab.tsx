'use client';

import React from 'react';
import { useSettingsStore } from '@/stores';
import { ParserSettings } from '@/types';
import { ValidationErrors } from './settings-validation';

const REGIONS = [
  { value: 'us', label: 'United States' },
  { value: 'eu', label: 'European Union' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
  { value: 'jp', label: 'Japan' },
  { value: 'au', label: 'Australia' },
] as const;

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
  { value: 'JPY', label: 'Japanese Yen (¥)' },
  { value: 'AUD', label: 'Australian Dollar (A$)' },
] as const;

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
] as const;

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: '日本語' },
] as const;

export function ParserSettingsTab() {
  const { settings, updateParserSettings } = useSettingsStore();

  const handleRegionChange = (defaultRegion: ParserSettings['defaultRegion']) => {
    updateParserSettings({ defaultRegion });
  };

  const handleCurrencyChange = (currency: ParserSettings['currency']) => {
    updateParserSettings({ currency });
  };

  const handleDateFormatChange = (dateFormat: ParserSettings['dateFormat']) => {
    updateParserSettings({ dateFormat });
  };

  const handleLanguageChange = (language: ParserSettings['language']) => {
    updateParserSettings({ language });
  };

  const handleStrictModeChange = (strictMode: boolean) => {
    updateParserSettings({
      validation: {
        ...settings.parser.validation,
        strictMode,
      },
    });
  };

  const handleConfidenceThresholdChange = (confidenceThreshold: number) => {
    updateParserSettings({
      validation: {
        ...settings.parser.validation,
        confidenceThreshold,
      },
    });
  };

  return (
    <div className="space-y-8">
      <ValidationErrors tab="parser" />

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-4">Parser Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Default Region */}
          <div>
            <label htmlFor="default-region" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Default Parser Region
            </label>
            <select
              id="default-region"
              value={settings.parser.defaultRegion}
              onChange={(e) => handleRegionChange(e.target.value as ParserSettings['defaultRegion'])}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              aria-describedby="default-region-description"
            >
              {REGIONS.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
            <p id="default-region-description" className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
              Choose the default region for invoice parsing
            </p>
          </div>

          {/* Currency */}
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Default Currency
            </label>
            <select
              id="currency"
              value={settings.parser.currency}
              onChange={(e) => handleCurrencyChange(e.target.value as ParserSettings['currency'])}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              aria-describedby="currency-description"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </select>
            <p id="currency-description" className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
              Default currency for parsed amounts
            </p>
          </div>

          {/* Date Format */}
          <div>
            <label htmlFor="date-format" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Date Format
            </label>
            <select
              id="date-format"
              value={settings.parser.dateFormat}
              onChange={(e) => handleDateFormatChange(e.target.value as ParserSettings['dateFormat'])}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              aria-describedby="date-format-description"
            >
              {DATE_FORMATS.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
            <p id="date-format-description" className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
              Format for displaying dates in results
            </p>
          </div>

          {/* Language */}
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Parser Language
            </label>
            <select
              id="language"
              value={settings.parser.language}
              onChange={(e) => handleLanguageChange(e.target.value as ParserSettings['language'])}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              aria-describedby="language-description"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            <p id="language-description" className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
              Language for parser output and error messages
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-4">Validation Settings</h3>
        <div className="space-y-4">
          {/* Strict Mode */}
          <div className="flex items-center">
            <input
              id="strict-mode"
              type="checkbox"
              checked={settings.parser.validation.strictMode}
              onChange={(e) => handleStrictModeChange(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800"
            />
            <label htmlFor="strict-mode" className="ml-2 block text-sm text-gray-900 dark:text-neutral-100">
              Strict validation mode
            </label>
          </div>
          <p className="text-sm text-gray-500 dark:text-neutral-400 ml-6">
            When enabled, parsing will fail on any validation warnings
          </p>

          {/* Confidence Threshold */}
          <div>
            <label htmlFor="confidence-threshold" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Confidence Threshold: {(settings.parser.validation.confidenceThreshold * 100).toFixed(0)}%
            </label>
            <input
              id="confidence-threshold"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.parser.validation.confidenceThreshold}
              onChange={(e) => handleConfidenceThresholdChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-neutral-400 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
              Minimum confidence score required for extracted data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}