'use client';

import { useEffect, useRef } from 'react';

// Timer type declarations
declare const clearInterval: (id: NodeJS.Timeout) => void;
declare const setInterval: (callback: (_: () => void) => void, delay: number) => NodeJS.Timeout;
import { useSearchParams, useRouter } from 'next/navigation';
import { useProcessingStore } from '@/stores/processing-store';
import { useUploadStore } from '@/stores/upload-store';
import { ProcessingDashboard } from '@/components/dashboard/processing-dashboard';
import { DashboardErrorBoundary } from '@/components/dashboard/error-boundary';

export function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get('jobId');
  const { currentJobId: uploadJobId } = useUploadStore();
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
    // Use URL param jobId if available, otherwise fall back to upload store's currentJobId
    const activeJobId = jobId || uploadJobId;

    if (activeJobId) {
      setCurrentJobId(activeJobId);

      // If we got the jobId from upload store but not URL, update URL for bookmarking
      if (!jobId && uploadJobId) {
        router.replace(`/dashboard?jobId=${uploadJobId}`, { scroll: false });
      }

      fetchJobStatus(activeJobId);
    } else {
      resetJobStatus();
    }
  }, [jobId, uploadJobId, setCurrentJobId, fetchJobStatus, resetJobStatus, router]);

  // Real-time polling effect
  useEffect(() => {
    const activeJobId = jobId || uploadJobId;

    const startPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(async () => {
        if (activeJobId && isActive) {
          try {
            await fetchJobStatus(activeJobId);
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

    if (activeJobId && isActive) {
      startPolling();
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [jobId, uploadJobId, isActive, fetchJobStatus]);

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
