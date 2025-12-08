'use client';

import React from 'react';
import { useSettingsStore } from '@/stores';
import { ExportSettings } from '@/types';
import { ValidationErrors } from './settings-validation';

const EXPORT_FORMATS = [
  { value: 'json', label: 'JSON', description: 'Structured data format for developers' },
  { value: 'csv', label: 'CSV', description: 'Spreadsheet-compatible format' },
  { value: 'pdf', label: 'PDF', description: 'Formatted report with charts and tables' },
] as const;

const CSV_DELIMITERS = [
  { value: ',', label: 'Comma (,)', description: 'Standard CSV format' },
  { value: ';', label: 'Semicolon (;)', description: 'European CSV format' },
  { value: '\t', label: 'Tab', description: 'Tab-separated values' },
] as const;

export function ExportSettingsTab() {
  const { settings, updateExportSettings } = useSettingsStore();

  const handleDefaultFormatChange = (defaultFormat: ExportSettings['defaultFormat']) => {
    updateExportSettings({ defaultFormat });
  };

  const handleIncludeValidationChange = (includeValidation: boolean) => {
    updateExportSettings({ includeValidation });
  };

  const handleIncludeMetadataChange = (includeMetadata: boolean) => {
    updateExportSettings({ includeMetadata });
  };

  const handleCsvDelimiterChange = (csvDelimiter: ExportSettings['csvDelimiter']) => {
    updateExportSettings({ csvDelimiter });
  };

  return (
    <div className="space-y-8">
      <ValidationErrors tab="export" />

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-4">Export Preferences</h3>
        <div className="space-y-6">
          {/* Default Export Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-3">
              Default Export Format
            </label>
            <div className="space-y-2">
              {EXPORT_FORMATS.map((format) => (
                <div key={format.value} className="flex items-center">
                  <input
                    id={`format-${format.value}`}
                    name="default-format"
                    type="radio"
                    value={format.value}
                    checked={settings.export.defaultFormat === format.value}
                    onChange={(e) => handleDefaultFormatChange(e.target.value as ExportSettings['defaultFormat'])}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                  />
                  <label htmlFor={`format-${format.value}`} className="ml-3 block text-sm font-medium text-gray-700 dark:text-neutral-300">
                    {format.label}
                  </label>
                  <span className="ml-2 text-sm text-gray-500 dark:text-neutral-400">
                    {format.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CSV Delimiter - only show if CSV is selected */}
          {settings.export.defaultFormat === 'csv' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-3">
                CSV Delimiter
              </label>
              <div className="space-y-2">
                {CSV_DELIMITERS.map((delimiter) => (
                  <div key={delimiter.value} className="flex items-center">
                    <input
                      id={`delimiter-${delimiter.value}`}
                      name="csv-delimiter"
                      type="radio"
                      value={delimiter.value}
                      checked={settings.export.csvDelimiter === delimiter.value}
                      onChange={(e) => handleCsvDelimiterChange(delimiter.value)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                    />
                    <label htmlFor={`delimiter-${delimiter.value}`} className="ml-3 block text-sm font-medium text-gray-700 dark:text-neutral-300">
                      {delimiter.label}
                    </label>
                    <span className="ml-2 text-sm text-gray-500 dark:text-neutral-400">
                      {delimiter.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-4">Export Content</h3>
        <div className="space-y-4">
          {/* Include Validation */}
          <div className="flex items-center">
            <input
              id="include-validation"
              type="checkbox"
              checked={settings.export.includeValidation}
              onChange={(e) => handleIncludeValidationChange(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 rounded"
            />
            <label htmlFor="include-validation" className="ml-2 block text-sm text-gray-900 dark:text-neutral-100">
              Include validation results
            </label>
          </div>
          <p className="text-sm text-gray-500 dark:text-neutral-400 ml-6">
            Add validation status and error information to exports
          </p>

          {/* Include Metadata */}
          <div className="flex items-center">
            <input
              id="include-metadata"
              type="checkbox"
              checked={settings.export.includeMetadata}
              onChange={(e) => handleIncludeMetadataChange(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 rounded"
            />
            <label htmlFor="include-metadata" className="ml-2 block text-sm text-gray-900 dark:text-neutral-100">
              Include extraction metadata
            </label>
          </div>
          <p className="text-sm text-gray-500 dark:text-neutral-400 ml-6">
            Include confidence scores, processing timestamps, and other metadata
          </p>
        </div>
      </div>

      {/* Export Preview */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-4">Export Preview</h3>
        <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-neutral-400 mb-2">
            <strong>Current settings will produce:</strong>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded border border-gray-200 dark:border-neutral-700 p-3 font-mono text-sm text-gray-900 dark:text-neutral-100">
            <div className="space-y-1">
              <div>Format: <span className="text-primary font-semibold">{settings.export.defaultFormat.toUpperCase()}</span></div>
              {settings.export.defaultFormat === 'csv' && (
                <div>Delimiter: <span className="text-primary font-semibold">
                  {CSV_DELIMITERS.find(d => d.value === settings.export.csvDelimiter)?.label || settings.export.csvDelimiter}
                </span></div>
              )}
              <div>Validation: <span className="text-primary font-semibold">{settings.export.includeValidation ? 'Included' : 'Excluded'}</span></div>
              <div>Metadata: <span className="text-primary font-semibold">{settings.export.includeMetadata ? 'Included' : 'Excluded'}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}