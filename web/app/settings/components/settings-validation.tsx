'use client';

import React from 'react';
import { useSettingsStore } from '@/stores';

interface ValidationErrorsProps {
  tab: 'parser' | 'ui' | 'export';
}

export function ValidationErrors({ tab }: ValidationErrorsProps) {
  const { getValidationErrors } = useSettingsStore();
  const errors = getValidationErrors();

  const tabErrors = errors[tab] || [];

  if (tabErrors.length === 0) {
    return null;
  }

  return (
    <div
      className="mb-6 bg-red-50 border border-red-200 rounded-md p-4"
      role="alert"
      aria-live="polite"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Validation Errors
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <ul role="list" className="list-disc pl-5 space-y-1">
              {tabErrors.map((error, index) => (
                <li key={index} id={`error-${tab}-${index}`}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ValidationSummaryProps {
  className?: string;
}

export function ValidationSummary({ className = '' }: ValidationSummaryProps) {
  const { getValidationErrors } = useSettingsStore();
  const errors = getValidationErrors();

  const totalErrors = Object.values(errors).reduce((sum, tabErrors) => sum + tabErrors.length, 0);

  if (totalErrors === 0) {
    return null;
  }

  const errorTabs = Object.keys(errors).filter(tab => errors[tab].length > 0);

  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-md p-3 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-amber-800">
            {totalErrors} validation error{totalErrors !== 1 ? 's' : ''} found in: {errorTabs.join(', ')}
          </p>
        </div>
      </div>
    </div>
  );
}