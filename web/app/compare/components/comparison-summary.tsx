import React from 'react';
import { Card } from '@/components/ui';
import { ComparisonReport } from '@/stores/comparison-store';

interface ComparisonSummaryProps {
  comparison: ComparisonReport;
}

export function ComparisonSummary({ comparison }: ComparisonSummaryProps) {
  const { summary, jobIds, generatedAt } = comparison;
  const { totalFields, fieldsWithDifferences, totalIssues, averageConfidence } = summary;

  const differencePercentage = totalFields > 0 ? (fieldsWithDifferences / totalFields) * 100 : 0;
  const confidencePercentage = averageConfidence * 100;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Comparison Summary
        </h2>
        <div className="text-sm text-gray-500">
          Generated {generatedAt.toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {/* Total Invoices */}
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{jobIds.length}</div>
          <div className="text-sm text-gray-600">Invoices Compared</div>
        </div>

        {/* Fields Compared */}
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{totalFields}</div>
          <div className="text-sm text-gray-600">Fields Compared</div>
        </div>

        {/* Fields with Differences */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${fieldsWithDifferences > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {fieldsWithDifferences}
          </div>
          <div className="text-sm text-gray-600">
            Fields with Differences ({differencePercentage.toFixed(1)}%)
          </div>
        </div>

        {/* Average Confidence */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${
            confidencePercentage >= 80 ? 'text-green-600' :
            confidencePercentage >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {confidencePercentage.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Average Confidence</div>
        </div>
      </div>

      {/* Issues Summary */}
      {totalIssues > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Validation Issues</h3>
              <p className="text-sm text-gray-600 mt-1">
                {totalIssues} issue{totalIssues !== 1 ? 's' : ''} found during comparison
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {totalIssues} Issues
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Job IDs */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Compared Job IDs</h3>
        <div className="flex flex-wrap gap-2">
          {jobIds.map((jobId, index) => (
            <span
              key={jobId}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              Invoice {index + 1}: {jobId}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}