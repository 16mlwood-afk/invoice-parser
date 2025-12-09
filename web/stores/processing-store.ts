import { create } from 'zustand';
import { ProcessingStatus, FileProcessingStatus } from '@/types/processing';
import { ProcessingApi } from '@/lib/api/processing';
import { useUploadStore } from './upload-store';

// Performance monitoring utilities
const isProduction = process.env.NODE_ENV === 'production';
const PERFORMANCE_LOGGING = process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_LOGGING === 'true' || !isProduction;

const performanceLogger = {
  log: (message: string, data?: any) => {
    if (PERFORMANCE_LOGGING) {
      console.log(`[ProcessingStore] ${message}`, data);
    }
  },
  warn: (message: string, data?: any) => {
    if (PERFORMANCE_LOGGING) {
      console.warn(`[ProcessingStore] ${message}`, data);
    }
  },
  error: (message: string, data?: any) => {
    console.error(`[ProcessingStore] ${message}`, data);
  }
};

// Job display states for auto-clear functionality
export type JobDisplayState = 'active' | 'completing' | 'fading' | 'removed';

interface JobDisplayInfo {
  displayState: JobDisplayState;
  countdownSeconds?: number;
  completedAt?: Date;
  fadeTimeoutId?: NodeJS.Timeout;
  countdownIntervalId?: NodeJS.Timeout;
}

interface ProcessingStore {
  // Current job being monitored
  currentJobId: string | null;
  jobStatus: ProcessingStatus | null;

  // Job display state for auto-clear functionality
  jobDisplayInfo: JobDisplayInfo;

  // UI state
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  setCurrentJobId: (jobId: string | null) => void;
  fetchJobStatus: (jobId?: string) => Promise<void>;
  cancelJob: () => Promise<void>;
  resetJobStatus: () => void;
  clearError: () => void;

  // Auto-clear actions
  startAutoClear: () => void;
  clearJobManually: () => void;
  updateCountdown: () => void;

  // Computed values
  isActive: boolean;
  progressPercentage: number;
  estimatedCompletion: Date | null;
  shouldShowJob: boolean;
}

export const useProcessingStore = create<ProcessingStore>((set, get) => ({
  currentJobId: null,
  jobStatus: null,
  jobDisplayInfo: {
    displayState: 'active',
  },
  isLoading: false,
  error: null,
  lastUpdated: null,

  setCurrentJobId: (jobId: string | null) => {
    set({ currentJobId: jobId });
  },

  fetchJobStatus: async (jobId?: string) => {
    const targetJobId = jobId || get().currentJobId;
    if (!targetJobId) return;

    set({ isLoading: true, error: null });

    try {
      const response = await ProcessingApi.getStatus(targetJobId);

      if (response.success && response.data) {
        const previousStatus = get().jobStatus?.status;
        const newStatus = response.data.status;

        set({
          jobStatus: response.data,
          lastUpdated: new Date(),
          isLoading: false,
        });

        // Handle job completion - start auto-clear for completed jobs (but not failed jobs)
        if (previousStatus !== 'completed' && newStatus === 'completed') {
          // Clear upload store files and job ID when job completes successfully
          useUploadStore.getState().clearFiles();
          get().startAutoClear();
        }
      } else {
        set({
          error: response.error || 'Failed to fetch job status',
          isLoading: false,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // If job not found, clear the current job ID
      if (errorMessage.includes('404') || errorMessage.includes('Job not found')) {
        set({
          currentJobId: null,
          jobStatus: null,
          error: 'Job not found or expired',
          isLoading: false,
        });
      } else {
        set({
          error: errorMessage,
          isLoading: false,
        });
      }
    }
  },

  cancelJob: async () => {
    const jobId = get().currentJobId;
    if (!jobId) return;

    set({ isLoading: true, error: null });

    try {
      const response = await ProcessingApi.cancelJob(jobId);

      if (response.success) {
        // Refresh status after cancellation
        await get().fetchJobStatus(jobId);
      } else {
        set({
          error: response.error || 'Failed to cancel job',
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        isLoading: false,
      });
    }
  },

  resetJobStatus: () => {
    // Clean up any existing timers
    const { fadeTimeoutId, countdownIntervalId, currentJobId } = get();

    if (fadeTimeoutId || countdownIntervalId) {
      performanceLogger.log('Cleaning up timers on reset', {
        jobId: currentJobId,
        fadeTimeoutId: !!fadeTimeoutId,
        countdownIntervalId: !!countdownIntervalId
      });

      if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
      if (countdownIntervalId) clearInterval(countdownIntervalId);
    }

    set({
      currentJobId: null,
      jobStatus: null,
      jobDisplayInfo: { displayState: 'active' },
      isLoading: false,
      error: null,
      lastUpdated: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },

  // Auto-clear actions
  startAutoClear: () => {
    const { jobDisplayInfo, currentJobId } = get();

    performanceLogger.log('Starting auto-clear countdown', {
      jobId: currentJobId,
      existingFadeTimeout: !!jobDisplayInfo.fadeTimeoutId,
      existingCountdownInterval: !!jobDisplayInfo.countdownIntervalId
    });

    // Clear any existing timers (prevent memory leaks)
    if (jobDisplayInfo.fadeTimeoutId) {
      clearTimeout(jobDisplayInfo.fadeTimeoutId);
      performanceLogger.log('Cleared existing fade timeout', { jobId: currentJobId });
    }
    if (jobDisplayInfo.countdownIntervalId) {
      clearInterval(jobDisplayInfo.countdownIntervalId);
      performanceLogger.log('Cleared existing countdown interval', { jobId: currentJobId });
    }

    // Start countdown at 7 seconds
    const countdownStart = 7;
    const startTime = Date.now();

    set({
      jobDisplayInfo: {
        ...jobDisplayInfo,
        displayState: 'completing',
        countdownSeconds: countdownStart,
        completedAt: new Date(),
        fadeTimeoutId: undefined,
        countdownIntervalId: undefined,
      }
    });

    // Start countdown timer
    const countdownIntervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, countdownStart - elapsed);

      performanceLogger.log('Countdown tick', {
        jobId: currentJobId,
        elapsed,
        remaining,
        expectedRemaining: get().jobDisplayInfo.countdownSeconds
      });

      get().updateCountdown();
    }, 1000);

    // Start fade-out timer (7 seconds total)
    const fadeTimeoutId = setTimeout(() => {
      const totalElapsed = Date.now() - startTime;
      performanceLogger.log('Auto-clear timeout triggered', {
        jobId: currentJobId,
        totalElapsedMs: totalElapsed,
        expectedMs: countdownStart * 1000
      });
      get().clearJobManually();
    }, countdownStart * 1000);

    // Update with timer IDs
    set((state) => ({
      jobDisplayInfo: {
        ...state.jobDisplayInfo,
        fadeTimeoutId,
        countdownIntervalId,
      }
    }));

    performanceLogger.log('Auto-clear timers started', {
      jobId: currentJobId,
      fadeTimeoutId: fadeTimeoutId.toString(),
      countdownIntervalId: countdownIntervalId.toString()
    });
  },

  clearJobManually: () => {
    const { jobDisplayInfo, currentJobId } = get();

    const wasAutoClear = jobDisplayInfo.fadeTimeoutId !== undefined;
    const manualTriggerTime = Date.now();

    performanceLogger.log('Clearing job manually', {
      jobId: currentJobId,
      wasAutoClear,
      displayState: jobDisplayInfo.displayState,
      countdownSeconds: jobDisplayInfo.countdownSeconds,
      completedAt: jobDisplayInfo.completedAt
    });

    // Clear timers
    if (jobDisplayInfo.fadeTimeoutId) {
      clearTimeout(jobDisplayInfo.fadeTimeoutId);
      performanceLogger.log('Cleared fade timeout on manual clear', { jobId: currentJobId });
    }
    if (jobDisplayInfo.countdownIntervalId) {
      clearInterval(jobDisplayInfo.countdownIntervalId);
      performanceLogger.log('Cleared countdown interval on manual clear', { jobId: currentJobId });
    }

    // First transition to fading state
    set({
      jobDisplayInfo: {
        ...jobDisplayInfo,
        displayState: 'fading',
        fadeTimeoutId: undefined,
        countdownIntervalId: undefined,
      }
    });

    // Then remove after animation (500ms)
    setTimeout(() => {
      performanceLogger.log('Job fully removed from dashboard', {
        jobId: currentJobId,
        totalTimeFromCompletion: jobDisplayInfo.completedAt
          ? manualTriggerTime - jobDisplayInfo.completedAt.getTime()
          : 'unknown'
      });

      set({
        jobDisplayInfo: {
          displayState: 'removed',
        }
      });
    }, 500);
  },

  updateCountdown: () => {
    const { jobDisplayInfo } = get();
    const currentCountdown = jobDisplayInfo.countdownSeconds || 0;

    if (currentCountdown > 1) {
      set({
        jobDisplayInfo: {
          ...jobDisplayInfo,
          countdownSeconds: currentCountdown - 1,
        }
      });
    }
  },

  get isActive(): boolean {
    const jobStatus = get().jobStatus;
    return jobStatus ? ['uploading', 'processing'].includes(jobStatus.status) : false;
  },

  get progressPercentage(): number {
    const jobStatus = get().jobStatus;
    return jobStatus?.progress?.percentage || 0;
  },

  get estimatedCompletion(): Date | null {
    const jobStatus = get().jobStatus;
    return jobStatus?.estimatedCompletion || null;
  },

  get shouldShowJob(): boolean {
    const { jobDisplayInfo, jobStatus } = get();
    // Don't show if removed, or if failed jobs are not in active state
    if (jobDisplayInfo.displayState === 'removed' as JobDisplayState) return false;
    if (jobStatus?.status === 'failed') return true; // Always show failed jobs
    return jobDisplayInfo.displayState !== ('removed' as JobDisplayState);
  },
}));
