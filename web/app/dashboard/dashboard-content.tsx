'use client';

import { useEffect, useRef } from 'react';

// Timer type declarations
declare const clearInterval: (id: NodeJS.Timeout) => void;
declare const setInterval: (callback: (_: () => void) => void, delay: number) => NodeJS.Timeout;
import { useSearchParams } from 'next/navigation';
import { useProcessingStore } from '@/stores/processing-store';
import { ProcessingDashboard } from '@/components/dashboard/processing-dashboard';
import { DashboardErrorBoundary } from '@/components/dashboard/error-boundary';

export function DashboardContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  const {
    setCurrentJobId,
    fetchJobStatus,
    resetJobStatus,
    isActive,
    jobStatus,
  } = useProcessingStore();

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const backoffDelayRef = useRef(2000); // Start with 2 seconds

  useEffect(() => {
    if (jobId) {
      setCurrentJobId(jobId);
      fetchJobStatus(jobId);
    } else {
      resetJobStatus();
    }
  }, [jobId, setCurrentJobId, fetchJobStatus, resetJobStatus]);

  // Real-time polling effect
  useEffect(() => {
    const startPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(async () => {
        if (jobId && isActive) {
          try {
            await fetchJobStatus(jobId);
            pollCountRef.current = 0;
            backoffDelayRef.current = 2000; // Reset backoff on success
          } catch {
            // Implement exponential backoff
            pollCountRef.current += 1;
            backoffDelayRef.current = Math.min(
              backoffDelayRef.current * 1.5,
              30000,
            ); // Max 30 seconds

            // Clear current interval and restart with new delay
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
            pollIntervalRef.current = setInterval(startPolling, backoffDelayRef.current);
          }
        }
      }, backoffDelayRef.current);
    };

    if (jobId && isActive) {
      startPolling();
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [jobId, isActive, fetchJobStatus]);

  // Stop polling when job is complete
  useEffect(() => {
    if (jobStatus && ['completed', 'failed', 'cancelled'].includes(jobStatus.status)) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [jobStatus?.status]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <main aria-label="Processing dashboard content" className="space-y-8">
          <DashboardErrorBoundary>
            <ProcessingDashboard />
          </DashboardErrorBoundary>
        </main>
      </div>
    </div>
  );
}
