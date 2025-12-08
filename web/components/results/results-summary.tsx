'use client';

import React from 'react';
import { Card } from '@/components/ui';

interface ResultsSummaryProps {
  summary: {
    totalFiles: number;
    processedFiles: number;
    failedFiles: number;
    successRate: number;
  };
  jobStatus: string;
  jobId: string;
}

export function ResultsSummary({ summary, jobStatus, jobId }: ResultsSummaryProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
    case 'completed':
      return 'text-green-700 bg-green-100';
    case 'failed':
      return 'text-red-700 bg-red-100';
    case 'partial':
      return 'text-yellow-700 bg-yellow-100';
    default:
      return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
    case 'completed':
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    case 'failed':
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    case 'partial':
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    default:
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
    case 'completed':
      return 'All files processed successfully';
    case 'failed':
      return 'Processing failed for all files';
    case 'partial':
      return 'Some files processed successfully';
    default:
      return 'Processing in progress';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Job Status Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Job Status</p>
            <p className="text-2xl font-bold text-gray-900 capitalize">{jobStatus}</p>
            <p className="text-sm text-gray-500 mt-1">{getStatusMessage(jobStatus)}</p>
          </div>
          <div className={`p-3 rounded-full ${getStatusColor(jobStatus)}`}>
            {getStatusIcon(jobStatus)}
          </div>
        </div>
      </Card>

      {/* Total Files Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Files</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalFiles}</p>
            <p className="text-sm text-gray-500 mt-1">Files uploaded</p>
          </div>
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </Card>

      {/* Success Rate Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Success Rate</p>
            <p className="text-2xl font-bold text-gray-900">{summary.successRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-500 mt-1">
              {summary.processedFiles} of {summary.totalFiles} successful
            </p>
          </div>
          <div className={`p-3 rounded-full ${
            summary.successRate >= 80 ? 'bg-green-100 text-green-600' :
              summary.successRate >= 50 ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
          }`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </Card>

      {/* Failed Files Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Failed Files</p>
            <p className="text-2xl font-bold text-gray-900">{summary.failedFiles}</p>
            <p className="text-sm text-gray-500 mt-1">
              {summary.failedFiles > 0 ? 'Requires attention' : 'No failures'}
            </p>
          </div>
          <div className={`p-3 rounded-full ${
            summary.failedFiles === 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          }`}>
            {summary.failedFiles === 0 ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      </Card>

      {/* Job ID Display */}
      <Card className="p-6 md:col-span-2 lg:col-span-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Job ID</p>
            <p className="text-lg font-mono text-gray-900">{jobId}</p>
            <p className="text-sm text-gray-500 mt-1">
              Use this ID to reference this processing job
            </p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(jobId)}
            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Copy Job ID"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
        </div>
      </Card>
    </div>
  );
}
