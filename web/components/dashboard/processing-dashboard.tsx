'use client';

import Link from 'next/link';
import { useProcessingStore } from '@/stores/processing-store';
import { ProcessingQueue } from './processing-queue';
import { ProgressBar } from './progress-bar';
import { ErrorDetails } from './error-details';
import { StatusBadge } from './status-badge';
import { estimateCompletionTime, formatEstimatedCompletion } from '@/utils/time-estimation';
import { useState } from 'react';

export function ProcessingDashboard() {
  const {
    currentJobId,
    jobStatus,
    isLoading,
    error,
    isActive,
    clearError,
    fetchJobStatus,
    lastUpdated,
    cancelJob,
  } = useProcessingStore();

  const progressPercentage = jobStatus?.progress?.percentage || 0;

  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleManualRefresh = async () => {
    if (currentJobId) {
      setIsManualRefresh(true);
      try {
        await fetchJobStatus(currentJobId);
      } finally {
        setIsManualRefresh(false);
      }
    }
  };

  const getConnectionStatus = () => {
    if (error) return { status: 'error', label: 'Connection Error' };
    if (isLoading || isManualRefresh) return { status: 'loading', label: 'Updating...' };
    if (lastUpdated) {
      const timeSinceUpdate = Date.now() - lastUpdated.getTime();
      if (timeSinceUpdate < 10000) return { status: 'connected', label: 'Connected' };
      if (timeSinceUpdate < 30000) return { status: 'warning', label: 'Stale Data' };
      return { status: 'error', label: 'Connection Lost' };
    }
    return { status: 'unknown', label: 'Unknown' };
  };

  const connectionStatus = getConnectionStatus();

  const handleCancelJob = async () => {
    try {
      await cancelJob();
      setShowCancelDialog(false);
    } catch (_error) {
      // Error is handled by the store
    }
  };

  // Check if job is not found (expired or doesn't exist)
  const isJobNotFound = error && (error.includes('Job not found') || error.includes('404'));

  if (isJobNotFound) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-800 dark:to-orange-700 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Job Not Found</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            The processing job you're looking for doesn't exist or has expired.
            Jobs are typically kept for 24-48 hours after completion.
          </p>
          <div className="space-y-4">
            <Link
              href="/upload"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-primary to-primary-hover hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transform hover:scale-105 transition-all mr-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload New Files
            </Link>
            <Link
              href="/results"
              className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-semibold rounded-xl text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              View Recent Results
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!currentJobId) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Active Processing Job</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Upload your invoice files to start processing and monitor progress in real-time.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-primary to-primary-hover hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transform hover:scale-105 transition-all"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Start Processing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Job Header */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8" aria-labelledby="job-header">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-hover rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white text-lg font-bold">📊</span>
              </div>
              <div>
                <h2 id="job-header" className="text-2xl font-bold text-gray-900 dark:text-white">
                  Processing Job {currentJobId}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Started {jobStatus?.startedAt ? new Date(jobStatus.startedAt).toLocaleString() : 'Unknown time'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Connection Status */}
            <div className="flex items-center space-x-3 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl" role="status" aria-live="polite" aria-label="Connection status">
              <div
                className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                  connectionStatus.status === 'connected' ? 'bg-success animate-pulse' :
                    connectionStatus.status === 'loading' ? 'bg-primary animate-pulse' :
                      connectionStatus.status === 'warning' ? 'bg-warning animate-pulse' :
                        'bg-error'
                }`}
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{connectionStatus.label}</span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center space-x-3">
              {/* Manual Refresh Button */}
              <button
                onClick={handleManualRefresh}
                disabled={isManualRefresh}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Refresh status"
              >
                {isManualRefresh ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Refresh
              </button>

              {/* Cancel Job Button */}
              {isActive && jobStatus?.status !== 'cancelled' && (
                <button
                  onClick={() => setShowCancelDialog(true)}
                  className="inline-flex items-center px-4 py-2 border border-red-500 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
                  title="Cancel processing job"
                >
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              )}

              {jobStatus && <StatusBadge status={jobStatus.status} />}
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 space-y-4" role="region" aria-labelledby="progress-heading">
          <div className="flex items-center justify-between">
            <h3 id="progress-heading" className="text-lg font-semibold text-gray-900 dark:text-white">Overall Progress</h3>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-primary" aria-live="polite" aria-atomic="true">
                {progressPercentage}%
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-300">complete</span>
            </div>
          </div>

          <ProgressBar
            progress={progressPercentage}
            aria-label={`Overall progress: ${progressPercentage}% complete`}
          />

          {jobStatus && isActive && (() => {
            const estimatedTime = estimateCompletionTime(jobStatus.files);
            return estimatedTime ? (
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span aria-live="polite">
                  Estimated completion: {formatEstimatedCompletion(estimatedTime)}
                </span>
              </div>
            ) : null;
          })()}
        </div>
      </section>

      {/* Error Display */}
      {error && (
        <div className="bg-error-light border border-error rounded-xl p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-error rounded-xl flex items-center justify-center">
                <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-error">Connection Error</h3>
              <p className="text-gray-700 dark:text-gray-200 mt-2">{error}</p>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={clearError}
                className="inline-flex items-center justify-center w-8 h-8 text-error hover:text-error rounded-lg hover:bg-error-light transition-colors"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processing Queue */}
      {jobStatus && <ProcessingQueue files={jobStatus.files} />}

      {/* Error Details */}
      {jobStatus && jobStatus.files.some(file => file.error) && (
        <ErrorDetails files={jobStatus.files.filter(file => file.error)} />
      )}

      {/* Cancel Job Confirmation Dialog */}
      {showCancelDialog && (
        <div
          className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          id="cancel-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
          aria-describedby="cancel-dialog-description"
        >
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700" role="document">
            <div className="p-8">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-error-light rounded-2xl flex items-center justify-center" aria-hidden="true">
                  <svg className="h-8 w-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>

              <h3 id="cancel-dialog-title" className="text-xl font-bold text-gray-900 dark:text-white text-center mb-3">
                Cancel Processing Job
              </h3>

              <p id="cancel-dialog-description" className="text-gray-600 dark:text-gray-300 text-center mb-8 leading-relaxed">
                Are you sure you want to cancel this processing job? This action cannot be undone.
                Any files currently being processed may be partially completed.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="flex-1 bg-white dark:bg-gray-800 py-3 px-6 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
                  autoFocus
                >
                  Keep Processing
                </button>
                <button
                  onClick={handleCancelJob}
                  disabled={isLoading}
                  className="flex-1 bg-error py-3 px-6 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white hover:bg-error focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Canceling...</span>
                    </div>
                  ) : (
                    'Cancel Job'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
