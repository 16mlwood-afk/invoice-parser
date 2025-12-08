'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container, Button, Card, Spinner } from '@/components/ui';
import { useResultsStore } from '@/stores/results-store';
import { ProcessingStatus } from '@/types/processing';


export default function ResultsIndexPage() {
  const router = useRouter();
  const { allJobs, allJobsLoading, allJobsError, loadAllJobs } = useResultsStore();
  const [showLandingPage, setShowLandingPage] = useState(false);

  useEffect(() => {
    // Load all jobs on component mount
    loadAllJobs();
  }, [loadAllJobs]);

  // Always show job list - no landing page needed
  // The user wants to see the job list interface even with no jobs

  if (allJobsLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading processing jobs...</p>
        </div>
      </div>
    );
  }

  if (allJobsError) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Failed to Load Jobs</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">{allJobsError}</p>
          <Button onClick={() => loadAllJobs()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
      <main className="py-8">
        <Container>
          {/* Breadcrumb Navigation */}
          <nav className="mb-8" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400">
              <li>
                <Link href="/" className="hover:text-primary transition-colors font-medium">
                  Home
                </Link>
              </li>
              <li>
                <svg className="w-4 h-4 text-neutral-400 dark:text-neutral-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </li>
              <li className="text-neutral-900 dark:text-neutral-100 font-semibold" aria-current="page">
                Results
              </li>
            </ol>
          </nav>

          <div className="max-w-4xl mx-auto">
            {/* Main Content */}
            <Card className="p-12 text-center">
              <div className="mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-hover rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                  Invoice Processing Results
                </h2>

                <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">
                  View detailed results from your processed invoices, export data in multiple formats,
                  and compare extraction accuracy across different documents.
                </p>
              </div>

              {/* Action Cards */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-success to-success-light rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">View Results</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Access detailed processing results for completed jobs</p>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-accent to-accent-hover rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Export Data</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Download results in JSON, CSV, or PDF formats</p>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-hover rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Compare Data</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Analyze and compare data across multiple invoices</p>
                </div>
              </div>

              {/* Call to Action */}
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-400">
                  Start by processing some invoice files to see your results here.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/upload">
                    <Button size="lg" className="bg-gradient-to-r from-primary to-primary-hover hover:shadow-lg transform hover:scale-105 transition-all">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload Files
                    </Button>
                  </Link>

                  <Link href="/dashboard">
                    <Button variant="outline" size="lg" className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      View Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>

            {/* Jobs List - Always show */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  Processing Jobs
                </h2>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  {allJobs.length} job{allJobs.length !== 1 ? 's' : ''} found
                </div>
              </div>

              {allJobs.length === 0 && !allJobsLoading && !allJobsError ? (
                /* Empty state when no jobs */
                <Card className="p-12 text-center">
                  <div className="mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-600 dark:to-neutral-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>

                    <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                      No Processing Jobs Yet
                    </h3>

                    <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                      Start by uploading some invoice files to see your processing results here.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/upload">
                      <Button size="lg" className="bg-gradient-to-r from-primary to-primary-hover hover:shadow-lg transform hover:scale-105 transition-all">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload Files
                      </Button>
                    </Link>

                    <Link href="/dashboard">
                      <Button variant="outline" size="lg" className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        View Dashboard
                      </Button>
                    </Link>
                  </div>
                </Card>
              ) : (
                /* Jobs List */
                <div className="grid gap-4">
                  {allJobs.map((job) => (
                    <Card key={job.jobId} className="p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                              Job {job.jobId.slice(-8)}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              job.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                                : job.status === 'failed'
                                ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                                : job.status === 'processing'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}>
                              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                            </span>
                          </div>

                          <div className="flex items-center space-x-6 text-sm text-neutral-600 dark:text-neutral-400">
                            <span>{job.progress.total} file{job.progress.total !== 1 ? 's' : ''}</span>
                            <span>Created {job.startedAt.toLocaleDateString()}</span>
                            {job.completedAt && (
                              <span>Completed {job.completedAt.toLocaleDateString()}</span>
                            )}
                            <span>{job.progress.percentage}% complete</span>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${job.progress.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-3 ml-4">
                          {job.status === 'completed' && (
                            <Link href={`/results/${job.jobId}`}>
                              <Button size="sm">View Results</Button>
                            </Link>
                          )}
                          {job.status === 'processing' && (
                            <Link href={`/dashboard`}>
                              <Button variant="outline" size="sm">View Progress</Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}