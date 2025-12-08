import React from 'react';
import { Card, Button } from '@/components/ui';
import { useComparisonStore } from '@/stores/comparison-store';

const FIELD_OPTIONS = [
  { key: 'orderNumber', label: 'Order Number' },
  { key: 'orderDate', label: 'Order Date' },
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'tax', label: 'Tax' },
  { key: 'total', label: 'Total' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'currency', label: 'Currency' },
  { key: 'items', label: 'Items' },
];

const SORT_OPTIONS = [
  { key: 'field', label: 'Field Name' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'differences', label: 'Has Differences' },
] as const;

export function ComparisonFilters() {
  const {
    comparisonOptions,
    sortBy,
    sortOrder,
    searchTerm,
    setComparisonOptions,
    setSortBy,
    toggleSortOrder,
    setSearchTerm,
    performComparison,
    selectedJobIds,
  } = useComparisonStore();

  const { selectedFields, confidenceThreshold, includeValidationIssues } = comparisonOptions;

  const handleFieldToggle = (fieldKey: string) => {
    const newSelectedFields = selectedFields.includes(fieldKey)
      ? selectedFields.filter(f => f !== fieldKey)
      : [...selectedFields, fieldKey];

    setComparisonOptions({ selectedFields: newSelectedFields });
  };

  const handleConfidenceChange = (value: number) => {
    setComparisonOptions({ confidenceThreshold: value });
  };

  const handleValidationToggle = () => {
    setComparisonOptions({ includeValidationIssues: !includeValidationIssues });
  };

  const handleRecompare = () => {
    performComparison(selectedJobIds, comparisonOptions);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Comparison Filters & Options
        </h2>
        <Button onClick={handleRecompare} size="sm">
          Re-compare with New Settings
        </Button>
      </div>

      <div className="space-y-6">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Search Fields
          </label>
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by field name or issue..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Search comparison fields"
            aria-describedby="search-help"
          />
          <div id="search-help" className="sr-only">
            Search through field names and validation issues to filter comparison results
          </div>
        </div>

        {/* Field Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Fields to Compare
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {FIELD_OPTIONS.map((field) => (
              <label key={field.key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field.key)}
                  onChange={() => handleFieldToggle(field.key)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  aria-describedby={`field-${field.key}-help`}
                />
                <span className="ml-2 text-sm text-gray-700">{field.label}</span>
                <span id={`field-${field.key}-help`} className="sr-only">
                  Include {field.label.toLowerCase()} in comparison
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Confidence Threshold */}
        <div>
          <label htmlFor="confidence" className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Confidence Threshold: {(confidenceThreshold * 100).toFixed(0)}%
          </label>
          <input
            id="confidence"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={confidenceThreshold}
            onChange={(e) => handleConfidenceChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`Confidence threshold: ${(confidenceThreshold * 100).toFixed(0)} percent`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={confidenceThreshold * 100}
            aria-valuetext={`${(confidenceThreshold * 100).toFixed(0)}% confidence threshold`}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Validation Issues */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeValidationIssues}
              onChange={handleValidationToggle}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Include validation issues in comparison</span>
          </label>
        </div>

        {/* Sorting */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Sort Results
          </label>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="sort-by" className="text-sm text-gray-700">Sort by:</label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={toggleSortOrder}
              variant="outline"
              size="sm"
            >
              {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}