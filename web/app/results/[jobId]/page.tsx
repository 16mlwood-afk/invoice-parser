'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Container, Button, Card } from '@/components/ui';
import { useResultsStore } from '@/stores/results-store';
import { ResultsTable } from '@/components/results/results-table';
import { ResultsSummary } from '@/components/results/results-summary';
import { ExportControls } from '@/components/results/export-controls';
import { Spinner } from '@/components/ui';

export default function ResultsPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const {
    loadResults,
    results,
    summary,
    errors,
    isLoading,
    error,
    jobStatus,
  } = useResultsStore();

  useEffect(() => {
    if (jobId && jobId !== 'undefined') {
      loadResults(jobId);
    }
  }, [jobId, loadResults]);

  if (!jobId || jobId === 'undefined') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Job ID</h1>
          <p className="text-gray-600 mb-6">No valid job ID provided.</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="py-8">
        <Container>
          {/* Breadcrumb Navigation */}
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li>
                <Link href="/" className="hover:text-gray-700 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  {/* eslint-disable-next-line max-len */}
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </li>
              <li>
                <Link href="/upload" className="hover:text-gray-700 transition-colors">
                  Upload Files
                </Link>
              </li>
              <li>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  {/* eslint-disable-next-line max-len */}
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </li>
              <li className="text-gray-900 font-medium" aria-current="page">
                Results
              </li>
            </ol>
          </nav>

          <div className="max-w-7xl mx-auto space-y-8">
            {/* Loading State */}
            {isLoading && (
              <Card className="p-8">
                <div className="flex items-center justify-center space-x-4">
                  <Spinner size="lg" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Loading Results</h3>
                    <p className="text-gray-600">Fetching processing results for job {jobId}...</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Error State */}
            {error && (
              <Card className="p-6 border-red-200 bg-red-50">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      {/* eslint-disable-next-line max-len */}
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-red-800">Error Loading Results</h3>
                    <p className="text-red-700 mt-1">{error}</p>
                    <div className="mt-4">
                      <Button
                        onClick={() => loadResults(jobId)}
                        variant="outline"
                        size="sm"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Results Summary */}
            {!isLoading && !error && summary && (
              <ResultsSummary
                summary={summary}
                jobStatus={jobStatus}
                jobId={jobId}
              />
            )}

            {/* Export Controls */}
            {!isLoading && !error && results.length > 0 && (
              <ExportControls />
            )}

            {/* Results Table */}
            {!isLoading && !error && results.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Processed Invoices ({results.length})
                  </h2>
                </div>
                <ResultsTable results={results} />
              </Card>
            )}

            {/* No Results State */}
            {!isLoading && !error && results.length === 0 &&
              jobStatus === 'completed' && (
              <Card className="p-8">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                  <p className="text-gray-600 mb-6">
                    No invoice data was successfully extracted from the uploaded files.
                  </p>
                  <div className="space-x-4">
                    <Link href="/upload">
                      <Button variant="outline">Upload More Files</Button>
                    </Link>
                    <Link href="/">
                      <Button>Go Home</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}

            {/* Processing Errors */}
            {!isLoading && !error && errors.length > 0 &&
              (
                <Card className="p-6 border-yellow-200 bg-yellow-50">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-yellow-800">
                      Processing Errors ({errors.length})
                      </h3>
                      <div className="mt-4 space-y-2">
                        {errors.slice(0, 3).map((error, index) => (
                          <div key={index} className="text-sm text-yellow-700">
                            <strong>{error.filename}:</strong> {error.error}
                          </div>
                        ))}
                        {errors.length > 3 && (
                          <p className="text-sm text-yellow-600">
                          ...and {errors.length - 3} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )}
          </div>
        </Container>
      </main>
    </div>
  );
}
