'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container, Button, Card, Spinner } from '@/components/ui';
import { useComparisonStore } from '@/stores/comparison-store';
import { ComparisonTable } from './components/comparison-table';
import { ComparisonFilters } from './components/comparison-filters';
import { ComparisonSummary } from './components/comparison-summary';
import { ComparisonExport } from './components/comparison-export';

export default function ComparisonPage() {
  const {
    currentComparison,
    selectedJobIds,
    isLoading,
    error,
    performComparison,
    clearComparison,
  } = useComparisonStore();

  const [jobIdInputs, setJobIdInputs] = useState<string[]>(['', '', '']);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from URL params or stored state
  useEffect(() => {
    if (!isInitialized) {
      // Pre-populate with selected job IDs if any
      if (selectedJobIds.length > 0) {
        const inputs = [...jobIdInputs];
        selectedJobIds.forEach((id, index) => {
          if (index < inputs.length) {
            inputs[index] = id;
          }
        });
        setJobIdInputs(inputs);
      }
      setIsInitialized(true);
    }
  }, [selectedJobIds, jobIdInputs, isInitialized]);

  const handleJobIdChange = (index: number, value: string) => {
    const newInputs = [...jobIdInputs];
    newInputs[index] = value.trim();
    setJobIdInputs(newInputs);
  };

  const addJobIdInput = () => {
    setJobIdInputs([...jobIdInputs, '']);
  };

  const removeJobIdInput = (index: number) => {
    if (jobIdInputs.length > 2) {
      const newInputs = jobIdInputs.filter((_, i) => i !== index);
      setJobIdInputs(newInputs);
    }
  };

  const handleCompare = async () => {
    const validJobIds = jobIdInputs.filter(id => id.trim() !== '');
    if (validJobIds.length < 2) {
      alert('Please enter at least 2 job IDs to compare');
      return;
    }

    await performComparison(validJobIds);
  };

  const handleClear = () => {
    clearComparison();
    setJobIdInputs(['', '', '']);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <main className="py-8">
        <Container>
          {/* Breadcrumb Navigation */}
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm text-gray-500 dark:text-neutral-400">
              <li>
                <Link href="/" className="hover:text-gray-700 dark:hover:text-neutral-300 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </li>
              <li className="text-gray-900 dark:text-neutral-100 font-medium" aria-current="page">
                Invoice Comparison
              </li>
            </ol>
          </nav>

          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            {/* Job ID Selection */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">
                  Select Invoices to Compare
                </h2>
                <div className="flex space-x-3">
                  <Button
                    onClick={handleClear}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleCompare}
                    disabled={isLoading || jobIdInputs.filter(id => id.trim()).length < 2}
                  >
                    {isLoading ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Comparing...
                      </>
                    ) : (
                      'Compare Invoices'
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-neutral-400">
                  Enter the job IDs of the invoice processing jobs you want to compare.
                  You can find job IDs in the processing results or dashboard.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {jobIdInputs.map((jobId, index) => (
                    <div key={index} className="flex space-x-2">
                      <div className="flex-1">
                        <label htmlFor={`job-id-${index}`} className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                          Job ID {index + 1}
                        </label>
                        <input
                          id={`job-id-${index}`}
                          type="text"
                          value={jobId}
                          onChange={(e) => handleJobIdChange(index, e.target.value)}
                          placeholder="e.g., abc123-def456"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md shadow-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={isLoading}
                        />
                      </div>
                      {jobIdInputs.length > 2 && (
                        <div className="flex items-end">
                          <Button
                            onClick={() => removeJobIdInput(index)}
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            className="mb-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <Button
                    onClick={addJobIdInput}
                    variant="outline"
                    size="sm"
                    disabled={isLoading || jobIdInputs.length >= 10}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Another Job ID
                  </Button>
                  <span className="text-sm text-gray-500 dark:text-neutral-400">
                    Comparing {jobIdInputs.filter(id => id.trim()).length} invoices
                  </span>
                </div>
              </div>
            </Card>

            {/* Error State */}
            {error && (
              <Card className="p-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-red-400 dark:text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Comparison Error</h3>
                    <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
                    <div className="mt-4">
                      <Button
                        onClick={handleCompare}
                        variant="outline"
                        size="sm"
                      >
                        Retry Comparison
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Comparison Results */}
            {currentComparison && !isLoading && !error && (
              <>
                {/* Comparison Summary */}
                <ComparisonSummary comparison={currentComparison} />

                {/* Filters */}
                <ComparisonFilters />

                {/* Export Controls */}
                <ComparisonExport />

                {/* Comparison Table */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">
                      Field-by-Field Comparison
                    </h2>
                  </div>
                  <ComparisonTable />
                </Card>
              </>
            )}

            {/* Empty State */}
            {!currentComparison && !isLoading && !error && (
              <Card className="p-8">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-400 dark:text-neutral-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2">No Comparison Data</h3>
                  <p className="text-gray-600 dark:text-neutral-400 mb-6">
                    Select multiple job IDs above and click "Compare Invoices" to start comparing invoice data.
                  </p>
                  <div className="space-x-4">
                    <Link href="/dashboard">
                      <Button variant="outline">View Processing Jobs</Button>
                    </Link>
                    <Link href="/upload">
                      <Button>Upload Files</Button>
                    </Link>
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