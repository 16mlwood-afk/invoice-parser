'use client';

import { useState } from 'react';
import { FileProcessingStatus } from '@/types/processing';

interface ErrorDetailsProps {
  files: FileProcessingStatus[];
}

interface ErrorGroup {
  category: string;
  title: string;
  description: string;
  suggestion: string;
  files: FileProcessingStatus[];
  severity: 'low' | 'medium' | 'high';
}

export function ErrorDetails({ files }: ErrorDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const errorFiles = files.filter(file => file.error);

  if (errorFiles.length === 0) {
    return null;
  }

  // Categorize errors
  const categorizeError = (error: string): ErrorGroup['category'] => {
    const lowerError = error.toLowerCase();

    if (lowerError.includes('pdf') || lowerError.includes('format') || lowerError.includes('corrupt')) {
      return 'file-format';
    }
    if (lowerError.includes('network') || lowerError.includes('connection') || lowerError.includes('timeout')) {
      return 'network';
    }
    if (lowerError.includes('parse') || lowerError.includes('extraction') || lowerError.includes('ocr')) {
      return 'parsing';
    }
    if (lowerError.includes('permission') || lowerError.includes('access') || lowerError.includes('denied')) {
      return 'permission';
    }
    if (lowerError.includes('size') || lowerError.includes('limit') || lowerError.includes('too large')) {
      return 'size-limit';
    }

    return 'unknown';
  };

  const getErrorGroup = (category: string): Omit<ErrorGroup, 'files' | 'severity'> => {
    switch (category) {
    case 'file-format':
      return {
        category: 'file-format',
        title: 'File Format Issues',
        description: 'PDF files may be corrupted, encrypted, or in an unsupported format.',
        suggestion: 'Try re-saving the PDF from the original application or check if the file is password-protected.',
      };
    case 'network':
      return {
        category: 'network',
        title: 'Network Connectivity',
        description: 'Connection issues prevented file upload or processing.',
        suggestion: 'Check your internet connection and try uploading the files again.',
      };
    case 'parsing':
      return {
        category: 'parsing',
        title: 'Data Extraction Issues',
        description: 'The invoice parser could not extract data from these files.',
        suggestion: 'Verify the invoice format is supported. Check if the PDF contains selectable text rather than images.',
      };
    case 'permission':
      return {
        category: 'permission',
        title: 'File Access Issues',
        description: 'Insufficient permissions to access or process the files.',
        suggestion: 'Ensure the files are not open in another application and check file permissions.',
      };
    case 'size-limit':
      return {
        category: 'size-limit',
        title: 'File Size Exceeded',
        description: 'Files are too large for processing.',
        suggestion: 'Reduce file size by compressing the PDF or splitting large documents.',
      };
    default:
      return {
        category: 'unknown',
        title: 'Processing Errors',
        description: 'Unexpected errors occurred during processing.',
        suggestion: 'Try processing the files again. If the issue persists, contact support.',
      };
    }
  };

  // Group errors by category
  const errorGroups = errorFiles.reduce((groups, file) => {
    const category = categorizeError(file.error || '');
    const existingGroup = groups.find(g => g.category === category);

    if (existingGroup) {
      existingGroup.files.push(file);
    } else {
      const groupTemplate = getErrorGroup(category);
      groups.push({
        ...groupTemplate,
        files: [file],
        severity: category === 'file-format' || category === 'parsing' ? 'high' :
          category === 'network' || category === 'permission' ? 'medium' : 'low',
      });
    }

    return groups;
  }, [] as ErrorGroup[]);

  // Sort by severity (high first)
  errorGroups.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  const getSeverityColor = (severity: ErrorGroup['severity']) => {
    switch (severity) {
    case 'high': return 'text-red-600 bg-red-50 border-red-200';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
          aria-expanded={isExpanded}
          aria-controls="error-details-content"
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Processing Errors ({errorFiles.length})
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {errorGroups.length} error categorie{errorGroups.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <svg
              className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      </div>

      {isExpanded && (
        <div id="error-details-content" className="px-6 py-4 space-y-4">
          {errorGroups.map((group, index) => (
            <div
              key={index}
              className={`rounded-lg border p-4 ${getSeverityColor(group.severity)}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium mb-1">{group.title}</h4>
                  <p className="text-sm mb-2">{group.description}</p>
                  <div className="bg-white bg-opacity-50 rounded p-3 mb-3">
                    <p className="text-sm">
                      <strong>Suggestion:</strong> {group.suggestion}
                    </p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium mb-2">Affected Files:</h5>
                    <ul className="space-y-1">
                      {group.files.map((file, fileIndex) => (
                        <li key={fileIndex} className="text-sm flex items-start space-x-2">
                          <span className="text-gray-400 mt-0.5">•</span>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium truncate" title={file.filename}>
                              {file.filename}
                            </span>
                            {file.error && (
                              <p className="text-xs text-gray-600 mt-1 break-words">
                                {file.error}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-800">Need Help?</h4>
                <p className="text-sm text-blue-700 mt-1">
                  If you're still experiencing issues, try uploading different files or contact support with the error details above.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
