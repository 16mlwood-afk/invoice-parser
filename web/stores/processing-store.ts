import { create } from 'zustand';
import { ProcessingStatus, FileProcessingStatus } from '@/types/processing';
import { ProcessingApi } from '@/lib/api/processing';

interface ProcessingStore {
  // Current job being monitored
  currentJobId: string | null;
  jobStatus: ProcessingStatus | null;

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

  // Computed values
  isActive: boolean;
  progressPercentage: number;
  estimatedCompletion: Date | null;
}

export const useProcessingStore = create<ProcessingStore>((set, get) => ({
  currentJobId: null,
  jobStatus: null,
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
        set({
          jobStatus: response.data,
          lastUpdated: new Date(),
          isLoading: false,
        });
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
    set({
      currentJobId: null,
      jobStatus: null,
      isLoading: false,
      error: null,
      lastUpdated: null,
    });
  },

  clearError: () => {
    set({ error: null });
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
}));
