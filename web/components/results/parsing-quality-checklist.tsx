'use client';

import React, { useState } from 'react';
import { ParsingQualityChecklist } from '@/types';
import { Button } from '@/components/ui';

interface ParsingQualityChecklistProps {
  checklist: ParsingQualityChecklist;
  className?: string;
}

const STATUS_COLORS = {
  excellent: 'text-green-600 bg-green-50 border-green-200',
  good: 'text-blue-600 bg-blue-50 border-blue-200',
  fair: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  poor: 'text-orange-600 bg-orange-50 border-orange-200',
  critical: 'text-red-600 bg-red-50 border-red-200'
};

const FIELD_STATUS_COLORS = {
  extracted: 'text-green-600 bg-green-50',
  missing: 'text-red-600 bg-red-50',
  invalid: 'text-orange-600 bg-orange-50'
};

const CONFIDENCE_COLORS = {
  high: 'text-green-600',
  medium: 'text-yellow-600',
  low: 'text-red-600'
};

export function ParsingQualityChecklistComponent({
  checklist,
  className = ''
}: ParsingQualityChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return CONFIDENCE_COLORS.high;
    if (confidence >= 60) return CONFIDENCE_COLORS.medium;
    return CONFIDENCE_COLORS.low;
  };

  const getFieldDisplayName = (field: ParsingQualityField) => {
    return field.displayName;
  };

  const formatFieldValue = (value: any) => {
    if (value === null || value === undefined) return 'Not extracted';
    if (Array.isArray(value)) return `${value.length} items`;
    if (typeof value === 'string' && value.length > 20) {
      return `${value.substring(0, 20)}...`;
    }
    return String(value);
  };

  const criticalFields = Object.entries(checklist.fields).filter(
    ([, field]) => field.critical
  );
  const nonCriticalFields = Object.entries(checklist.fields).filter(
    ([, field]) => !field.critical
  );

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      {/* Overall Quality Score */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Parsing Quality</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium border ${
            STATUS_COLORS[checklist.overall.status]
          }`}>
            {checklist.overall.score}% - {checklist.overall.status.charAt(0).toUpperCase() + checklist.overall.status.slice(1)}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {checklist.overall.extractedFields}
          </div>
          <div className="text-sm text-gray-600">Fields Extracted</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {checklist.overall.criticalFieldsMissing}
          </div>
          <div className="text-sm text-gray-600">Critical Missing</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {checklist.overall.totalFields}
          </div>
          <div className="text-sm text-gray-600">Total Fields</div>
        </div>
      </div>

      {/* Recommendations */}
      {checklist.recommendations.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">Recommendations:</h4>
          <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
            {checklist.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Field Breakdown */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Critical Fields */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Critical Fields</h4>
            <div className="grid gap-2">
              {criticalFields.map(([fieldName, field]) => (
                <div
                  key={fieldName}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      FIELD_STATUS_COLORS[field.status]
                    }`}>
                      {field.status}
                    </div>
                    <span className="font-medium">
                      {getFieldDisplayName(field)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      {formatFieldValue(field.value)}
                    </span>
                    <div className={`text-sm font-medium ${
                      getConfidenceColor(field.confidence)
                    }`}>
                      {field.confidence}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Non-Critical Fields */}
          {nonCriticalFields.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Additional Fields</h4>
              <div className="grid gap-2">
                {nonCriticalFields.map(([fieldName, field]) => (
                  <div
                    key={fieldName}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        FIELD_STATUS_COLORS[field.status]
                      }`}>
                        {field.status}
                      </div>
                      <span className="font-medium">
                        {getFieldDisplayName(field)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        {formatFieldValue(field.value)}
                      </span>
                      <div className={`text-sm font-medium ${
                        getConfidenceColor(field.confidence)
                      }`}>
                        {field.confidence}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      {/* Overall Score */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[checklist.overall.status]}`}>
            {checklist.overall.status.charAt(0).toUpperCase() + checklist.overall.status.slice(1)}
          </div>
          <span className="text-lg font-bold">{checklist.overall.score}%</span>
          <span className="text-sm text-gray-600 dark:text-neutral-400">
            {checklist.overall.totalFields - checklist.overall.criticalFieldsMissing} of {checklist.overall.totalFields} fields extracted
          </span>
        </div>
      </div>

      {/* Critical Fields */}
      {criticalFields.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-neutral-100 mb-2">
            Critical Fields ({criticalFields.length})
          </h4>
          <div className="grid gap-2">
            {criticalFields.map(([fieldName, field]) => (
              <div
                key={fieldName}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    FIELD_STATUS_COLORS[field.status]
                  }`}>
                    {field.status}
                  </div>
                  <span className="font-medium">
                    {getFieldDisplayName(field)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-neutral-400">
                    {formatFieldValue(field.value)}
                  </span>
                  <div className={`text-sm font-medium ${
                    getConfidenceColor(field.confidence)
                  }`}>
                    {field.confidence}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Fields (Expandable) */}
      {Object.keys(checklist.fields).length > criticalFields.length && (
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between"
          >
            <span>All Fields ({Object.keys(checklist.fields).length})</span>
            <svg
              className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Button>

          {isExpanded && (
            <div className="mt-2 space-y-2">
              {Object.entries(checklist.fields).map(([fieldName, field]) => (
                <div
                  key={fieldName}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-neutral-800 rounded"
                >
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      FIELD_STATUS_COLORS[field.status]
                    }`}>
                      {field.status}
                    </div>
                    <span className="font-medium">
                      {getFieldDisplayName(field)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 dark:text-neutral-400">
                      {formatFieldValue(field.value)}
                    </span>
                    <div className={`text-sm font-medium ${
                      getConfidenceColor(field.confidence)
                    }`}>
                      {field.confidence}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {checklist.recommendations && checklist.recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-neutral-100 mb-2">
            Recommendations
          </h4>
          <div className="space-y-2">
            {checklist.recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg text-sm ${
                  rec.type === 'critical'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : rec.type === 'warning'
                    ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}
              >
                {rec.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}