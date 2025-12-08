import React from 'react';
import { useComparisonStore, ComparisonResult } from '@/stores/comparison-store';

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-900';
  if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900';
  return 'text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-900';
}

function getDifferenceColor(hasDifferences: boolean): string {
  return hasDifferences ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950' : 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950';
}

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(confidence)}`}>
      {percentage}%
    </span>
  );
}

function FieldComparisonRow({ result, rowIndex, totalRows }: { result: ComparisonResult; rowIndex: number; totalRows: number }) {
  const { toggleFieldExpansion, expandedFields } = useComparisonStore();
  const isExpanded = expandedFields.has(result.field);

  const hasHighSeverityIssues = result.issues.some(issue => issue.severity === 'high');
  const hasMediumSeverityIssues = result.issues.some(issue => issue.severity === 'medium');

  return (
    <>
      {/* Main Row */}
      <tr
        className={`${getDifferenceColor(result.hasDifferences)} ${isExpanded ? 'border-b-0' : ''}`}
        role="row"
        aria-expanded={isExpanded}
        aria-level={1}
        aria-posinset={rowIndex + 1}
        aria-setsize={totalRows}
      >
        <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <button
              onClick={() => toggleFieldExpansion(result.field)}
              className="text-gray-400 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300 mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
              data-field={result.field}
            >
              <svg
                className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-neutral-100 capitalize">
                {result.field.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </div>
              {result.issues.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                  {result.issues.length} issue{result.issues.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Values for each invoice */}
        {result.values.map((value, index) => (
          <td key={`${result.field}-value-${index}`} className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-900 dark:text-neutral-100">
              {value.value !== null && value.value !== undefined ? String(value.value) : '-'}
            </div>
            <div className="flex items-center mt-1">
              <ConfidenceIndicator confidence={value.confidence} />
              <span className="text-xs text-gray-500 dark:text-neutral-400 ml-2 capitalize">
                {value.source}
              </span>
            </div>
          </td>
        ))}

        {/* Status */}
        <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
          <div className="flex items-center space-x-2">
            {result.hasDifferences && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                Differences
              </span>
            )}
            {hasHighSeverityIssues && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                High Priority
              </span>
            )}
            {hasMediumSeverityIssues && !hasHighSeverityIssues && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                Medium Priority
              </span>
            )}
            {!result.hasDifferences && result.issues.length === 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                No Issues
              </span>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Details */}
      {isExpanded && (
        <tr className="bg-gray-50 dark:bg-neutral-800 border-t border-gray-200 dark:border-neutral-700">
          <td colSpan={result.values.length + 2} className="px-6 py-4">
            <div className="space-y-3">
              {/* Issues */}
              {result.issues.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-neutral-100 mb-2">Issues Found:</h4>
                  <div className="space-y-2">
                    {result.issues.map((issue, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                          issue.severity === 'high' ? 'bg-red-500' :
                          issue.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 dark:text-neutral-300">{issue.message}</p>
                          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                            Type: {issue.type} | Severity: {issue.severity} |
                            Affected: {issue.affectedInvoices.join(', ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Values */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-neutral-100 mb-2">Detailed Values:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {result.values.map((value, index) => (
                    <div key={index} className="bg-white dark:bg-neutral-900 p-3 rounded-md border border-gray-200 dark:border-neutral-700">
                      <div className="text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                        Invoice {index + 1}
                      </div>
                      <div className="text-sm text-gray-900 dark:text-neutral-100">
                        {value.value !== null && value.value !== undefined ? String(value.value) : 'Not available'}
                      </div>
                      <div className="flex items-center mt-2 space-x-2">
                        <ConfidenceIndicator confidence={value.confidence} />
                        <span className="text-xs text-gray-500 dark:text-neutral-400 capitalize">
                          {value.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function ComparisonTable() {
  const { getFilteredResults, currentComparison, toggleFieldExpansion } = useComparisonStore();
  const filteredResults = getFilteredResults();

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      // Find the closest expandable row and toggle it
      const target = event.target as HTMLElement;
      const row = target.closest('[role="row"]') as HTMLElement;
      if (row) {
        const fieldName = row.querySelector('[data-field]')?.getAttribute('data-field');
        if (fieldName) {
          event.preventDefault();
          toggleFieldExpansion(fieldName);
        }
      }
    }
  };

  return (
    <div className="overflow-x-auto" role="region" aria-label="Invoice comparison results" tabIndex={0}>
      <table
        className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700 table-fixed sm:table-auto"
        role="table"
        aria-label={`Comparison of ${currentComparison?.jobIds.length || 0} invoices`}
        onKeyDown={handleKeyDown}
      >
        <thead className="bg-gray-50 dark:bg-neutral-800">
          <tr role="row">
            <th
              scope="col"
              className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider w-32 sm:w-auto"
              role="columnheader"
              aria-sort="none"
            >
              Field
            </th>
            {Array.from({ length: currentComparison?.jobIds.length || 0 }, (_, i) => (
              <th
                key={i}
                scope="col"
                className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider w-24 sm:w-auto"
                role="columnheader"
                aria-sort="none"
              >
                <span className="hidden sm:inline">Invoice {i + 1}</span>
                <span className="sm:hidden">Inv {i + 1}</span>
                <div className="text-xs text-gray-400 dark:text-neutral-500 mt-1 truncate" aria-label={`Job ID ending in ${currentComparison?.jobIds[i]?.slice(-8)}`}>
                  {currentComparison?.jobIds[i]?.slice(-8)}
                </div>
              </th>
            ))}
            <th
              scope="col"
              className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider w-20 sm:w-auto"
              role="columnheader"
              aria-sort="none"
            >
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-700" role="rowgroup">
          {filteredResults.map((result, index) => (
            <FieldComparisonRow
              key={result.field}
              result={result}
              rowIndex={index}
              totalRows={filteredResults.length}
            />
          ))}
        </tbody>
      </table>

      {filteredResults.length === 0 && (
        <div className="text-center py-8" role="status" aria-live="polite">
          <p className="text-gray-500 dark:text-neutral-400">No fields match the current filters</p>
        </div>
      )}
    </div>
  );
}
