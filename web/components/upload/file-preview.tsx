'use client';

import React from 'react';
import { FilePreview as FilePreviewType } from './types';
import { formatFileSize } from './file-validation';

interface FilePreviewProps {
  file: FilePreviewType;
  onRemove: (_fileId: string) => void;
  showRemove?: boolean;
}

export function FilePreview({ file, onRemove, showRemove = true }: FilePreviewProps) {
  const getStatusIcon = () => {
    switch (file.validationStatus) {
    case 'valid':
      return (
        <svg className="h-5 w-5 text-success" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    case 'invalid':
      return (
        <svg className="h-5 w-5 text-error" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    default:
      return (
        <svg className="h-5 w-5 text-gray-400 animate-spin" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  const getStatusColor = () => {
    switch (file.validationStatus) {
    case 'valid':
      return 'border-success/20 bg-success/5 dark:border-success/30 dark:bg-success/10';
    case 'invalid':
      return 'border-error/20 bg-error/5 dark:border-error/30 dark:bg-error/10';
    default:
      return 'border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-800';
    }
  };

  return (
    <div
      className={
        `flex items-center justify-between p-4 border rounded-lg transition-all duration-200 ${
          getStatusColor()}`
      }
      data-testid={`file-preview-${file.id}`}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* PDF Icon */}
        <div className="flex-shrink-0">
          <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-900 dark:text-neutral-100 truncate">
              {file.name}
            </p>
            {getStatusIcon()}
          </div>
          <div className="flex items-center space-x-4 mt-1">
            <p className="text-xs text-gray-500 dark:text-neutral-400">
              {formatFileSize(file.size)}
            </p>
            <p className="text-xs text-gray-500 dark:text-neutral-400">
              {file.type || 'PDF'}
            </p>
          </div>
          {file.errorMessage && (
            <p className="text-xs text-error dark:text-red-300 mt-1">
              {file.errorMessage}
            </p>
          )}
        </div>
      </div>

      {/* Remove Button */}
      {showRemove && (
        <div className="flex-shrink-0 ml-4">
          <button
            type="button"
            onClick={() => onRemove(file.id)}
            className={
              'inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-400 dark:text-neutral-500 ' +
              'hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors'
            }
            aria-label={`Remove ${file.name}`}
            data-testid={`remove-file-${file.id}`}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
