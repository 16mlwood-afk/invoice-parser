'use client';

import React from 'react';
import { ValidationError } from './types';

interface UploadProgressProps {
  isUploading: boolean;
  progress: number;
  errors: ValidationError[];
  onRetry?: () => void;
  onCancel?: () => void;
}

export function UploadProgress({
  isUploading,
  progress,
  errors,
  onRetry,
  onCancel,
}: UploadProgressProps) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-6 mb-6" data-testid="upload-progress">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100">
          {isUploading ? 'Uploading Files' : 'Upload Complete'}
        </h3>
        {isUploading && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={
              'inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-neutral-300 ' +
              'bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors'
            }
          >
            Cancel
          </button>
        )}
      </div>

      {isUploading && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-neutral-400 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2" data-testid="progress-bar-container">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
              data-testid="progress-bar-fill"
            />
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-error dark:text-red-300">
              Upload Errors ({errors.length})
            </h4>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={
                  'inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary ' +
                  'bg-primary/10 border border-primary/20 rounded-md hover:bg-primary/20 ' +
                  'transition-colors'
                }
              >
                Retry Failed
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {errors.map((error, index) => (
              <div
                key={`${error.fileId}-${index}`}
                className="flex items-start space-x-2 text-sm"
              >
                <svg className="h-4 w-4 text-error mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-neutral-300">{error.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isUploading && errors.length === 0 && (
        <div className="flex items-center space-x-2 text-sm text-success">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>All files uploaded successfully</span>
        </div>
      )}
    </div>
  );
}
