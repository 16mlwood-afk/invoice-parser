'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { useResultsStore } from '@/stores/results-store';

export function ExportControls() {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { exportResults } = useResultsStore();

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    setIsExporting(format);
    try {
      await exportResults(format);
    } catch (error) {
      console.error(`Export failed for ${format}:`, error);
      // Error handling is done in the store
    } finally {
      setIsExporting(null);
    }
  };

  const exportOptions = [
    {
      format: 'json' as const,
      label: 'JSON',
      description: 'Complete data in JSON format',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V21a4 4 0 01-4 4H7z" />
        </svg>
      ),
    },
    {
      format: 'csv' as const,
      label: 'CSV',
      description: 'Spreadsheet-compatible format',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      format: 'pdf' as const,
      label: 'PDF',
      description: 'Formatted report document',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Export Results</h3>
          <p className="text-sm text-gray-600">Download processed invoice data in your preferred format</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {exportOptions.map((option) => (
          <div
            key={option.format}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="p-2 bg-gray-100 rounded-md text-gray-600">
                  {option.icon}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900">{option.label}</h4>
                <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                <div className="mt-3">
                  <Button
                    onClick={() => handleExport(option.format)}
                    disabled={isExporting !== null}
                    loading={isExporting === option.format}
                    size="sm"
                    className="w-full"
                  >
                    {isExporting === option.format ? 'Exporting...' : `Export ${option.label}`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Export Formats:</strong> JSON includes complete structured data, CSV is optimized for spreadsheet applications, and PDF provides a formatted report view.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
