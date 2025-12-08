import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { useComparisonStore } from '@/stores/comparison-store';
import { Card } from '@/components/ui';

type ExportFormat = 'json' | 'csv' | 'pdf';

export function ComparisonExport() {
  const { currentComparison, exportComparison } = useComparisonStore();
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);

  if (!currentComparison) {
    return null;
  }

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(format);
    try {
      await exportComparison(format);
    } catch (error) {
      console.error(`Export failed for ${format}:`, error);
      // Error handling will be shown through the store
    } finally {
      setIsExporting(null);
    }
  };

  const exportFormats = [
    {
      format: 'json' as const,
      label: 'JSON',
      description: 'Complete comparison data with all details',
      icon: '📄',
    },
    {
      format: 'csv' as const,
      label: 'CSV',
      description: 'Tabular format for spreadsheet analysis',
      icon: '📊',
    },
    {
      format: 'pdf' as const,
      label: 'PDF Report',
      description: 'Formatted report with summary and details',
      icon: '📋',
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Export Comparison</h2>
          <p className="text-sm text-gray-600 mt-1">
            Download comparison results in your preferred format
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exportFormats.map(({ format, label, description, icon }) => (
          <div
            key={format}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <h3 className="font-medium text-gray-900">{label}</h3>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            </div>

            <Button
              onClick={() => handleExport(format)}
              disabled={isExporting !== null}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {isExporting === format ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Exporting...
                </>
              ) : (
                `Export ${label}`
              )}
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <p className="mb-2">
            <strong>Export includes:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Field-by-field comparison results</li>
            <li>Difference analysis and severity levels</li>
            <li>Confidence scores and validation issues</li>
            <li>Summary statistics and metadata</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}