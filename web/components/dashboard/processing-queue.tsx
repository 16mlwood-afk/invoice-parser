'use client';

import { useState } from 'react';
import { FileProcessingStatus } from '@/types/processing';
import { StatusBadge } from './status-badge';
import { ProgressBar } from './progress-bar';

interface ProcessingQueueProps {
  files: FileProcessingStatus[];
}

type SortField = 'filename' | 'status' | 'progress' | 'startedAt' | 'completedAt';
type SortDirection = 'asc' | 'desc';

export function ProcessingQueue({ files }: ProcessingQueueProps) {
  const [sortField, setSortField] = useState<SortField>('filename');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedFiles = [...files].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle date sorting
    if (sortField === 'startedAt' || sortField === 'completedAt') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }

    // Handle string sorting
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const formatTime = (date?: Date) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString();
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (files.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Files</h3>
          <p className="text-gray-500">No files have been uploaded for processing yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Processing Queue</h3>
        <p className="text-sm text-gray-500 mt-1">
          {files.length} file{files.length !== 1 ? 's' : ''} in queue
        </p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" role="table" aria-label="Processing queue with file details">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                onClick={() => handleSort('filename')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSort('filename');
                  }
                }}
                tabIndex={0}
                role="columnheader"
                aria-sort={sortField === 'filename' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <div className="flex items-center space-x-1">
                  <span>File Name</span>
                  <span className="text-xs" aria-hidden="true">{getSortIcon('filename')}</span>
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  <span className="text-xs">{getSortIcon('status')}</span>
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('progress')}
              >
                <div className="flex items-center space-x-1">
                  <span>Progress</span>
                  <span className="text-xs">{getSortIcon('progress')}</span>
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('startedAt')}
              >
                <div className="flex items-center space-x-1">
                  <span>Started</span>
                  <span className="text-xs">{getSortIcon('startedAt')}</span>
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('completedAt')}
              >
                <div className="flex items-center space-x-1">
                  <span>Completed</span>
                  <span className="text-xs">{getSortIcon('completedAt')}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedFiles.map((file, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-xs" title={file.filename}>
                        {file.filename}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={file.status} />
                    {file.error && (
                      <div className="relative" title={file.error}>
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 min-w-0">
                      <ProgressBar progress={file.progress} size="sm" />
                    </div>
                    <span className="text-sm text-gray-500 w-12 text-right">
                      {file.progress}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTime(file.startedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTime(file.completedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden" role="list" aria-label="Processing queue files">
        <div className="divide-y divide-gray-200">
          {sortedFiles.map((file, index) => (
            <article key={index} className="px-4 py-4 space-y-3" role="listitem">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center" aria-hidden="true">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate" title={file.filename}>
                      {file.filename}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusBadge status={file.status} />
                  {file.error && (
                    <div className="relative" title={file.error}>
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732 2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Progress</span>
                  <span className="text-sm font-medium text-gray-900">{file.progress}%</span>
                </div>
                <ProgressBar progress={file.progress} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Started:</span>
                  <span className="ml-2 text-gray-900">{formatTime(file.startedAt)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Completed:</span>
                  <span className="ml-2 text-gray-900">{formatTime(file.completedAt)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
