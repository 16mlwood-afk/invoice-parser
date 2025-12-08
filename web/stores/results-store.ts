import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { InvoiceData } from '@/types';
import { apiClient, ResultsResponse } from '@/lib/api-client';
import { ProcessingApi } from '@/lib/api/processing';
import { ProcessingStatus } from '@/types/processing';

interface ResultsSummary {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  successRate: number;
}

interface ProcessingError {
  filename: string;
  error: string;
  details?: any;
}

interface ResultsState {
  // Current job data
  currentJobId?: string;
  jobStatus: 'idle' | 'loading' | 'completed' | 'failed' | 'partial';

  // All jobs data
  allJobs: ProcessingStatus[];
  allJobsLoading: boolean;
  allJobsError: string | null;

  // Results data
  results: InvoiceData[];
  summary: ResultsSummary | null;
  errors: ProcessingError[];

  // UI state
  isLoading: boolean;
  error: string | null;
  sortBy: keyof InvoiceData;
  sortOrder: 'asc' | 'desc';
  searchTerm: string;

  // Actions
  loadResults: (jobId: string) => Promise<void>;
  loadAllJobs: () => Promise<void>;
  exportResults: (format: 'json' | 'csv' | 'pdf') => Promise<void>;
  setSortBy: (field: keyof InvoiceData) => void;
  toggleSortOrder: () => void;
  setSearchTerm: (term: string) => void;
  clearResults: () => void;
  getFilteredResults: () => InvoiceData[];
  getResultByFilename: (filename: string) => InvoiceData | undefined;
}

export const useResultsStore = create<ResultsState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentJobId: undefined,
      jobStatus: 'idle',
      allJobs: [],
      allJobsLoading: false,
      allJobsError: null,
      results: [],
      summary: null,
      errors: [],
      isLoading: false,
      error: null,
      sortBy: 'filename',
      sortOrder: 'asc',
      searchTerm: '',

      // Load results from API
      loadResults: async (jobId: string) => {
        set({
          isLoading: true,
          error: null,
          currentJobId: jobId,
        });

        try {
          const response = await apiClient.getResults(jobId);

          if (response.success && response.data) {
            const data: ResultsResponse = response.data;

            set({
              results: data.results,
              summary: data.summary,
              errors: data.errors,
              jobStatus: data.status,
              isLoading: false,
            });
          } else {
            throw new Error(response.error || 'Failed to load results');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load results',
            isLoading: false,
            jobStatus: 'failed',
          });
        }
      },

      // Load all jobs
      loadAllJobs: async () => {
        set({
          allJobsLoading: true,
          allJobsError: null,
        });

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/results`);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();

          if (data.jobs) {
            // Transform the jobs data to match the expected ProcessingStatus format
            const transformedJobs: ProcessingStatus[] = data.jobs.map((job: any) => ({
              jobId: job.jobId,
              status: job.status,
              progress: {
                total: job.fileCount,
                completed: job.successCount,
                failed: job.fileCount - job.successCount,
                percentage: job.fileCount > 0 ? Math.round((job.successCount / job.fileCount) * 100) : 0,
              },
              files: [], // We don't have detailed file info in this endpoint
              startedAt: new Date(job.createdAt),
              completedAt: undefined, // Not available in this endpoint
            }));

            set({
              allJobs: transformedJobs,
              allJobsLoading: false,
            });
          } else {
            throw new Error('Invalid response format');
          }
        } catch (error) {
          set({
            allJobsError: error instanceof Error ? error.message : 'Failed to load jobs',
            allJobsLoading: false,
          });
        }
      },

      // Export results
      exportResults: async (format: 'json' | 'csv' | 'pdf') => {
        const { currentJobId } = get();
        if (!currentJobId) {
          set({ error: 'No job selected for export' });
          return;
        }

        try {
          await apiClient.exportResults(currentJobId, format);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Export failed',
          });
        }
      },

      // Sorting
      setSortBy: (field: keyof InvoiceData) => {
        set({ sortBy: field });
      },

      toggleSortOrder: () => {
        set((state) => ({
          sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc',
        }));
      },

      // Search
      setSearchTerm: (term: string) => {
        set({ searchTerm: term });
      },

      // Clear results
      clearResults: () => {
        set({
          currentJobId: undefined,
          jobStatus: 'idle',
          allJobs: [],
          allJobsLoading: false,
          allJobsError: null,
          results: [],
          summary: null,
          errors: [],
          error: null,
          searchTerm: '',
        });
      },

      // Get filtered and sorted results
      getFilteredResults: () => {
        const { results, sortBy, sortOrder, searchTerm } = get();

        // Filter by search term
        let filtered = results;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = results.filter(result =>
            result.filename.toLowerCase().includes(term) ||
            result.orderNumber?.toLowerCase().includes(term) ||
            result.customerInfo?.name?.toLowerCase().includes(term),
          );
        }

        // Sort results
        filtered.sort((a, b) => {
          const aValue = a[sortBy];
          const bValue = b[sortBy];

          // Handle null/undefined values
          if (aValue == null && bValue == null) return 0;
          if (aValue == null) return sortOrder === 'asc' ? -1 : 1;
          if (bValue == null) return sortOrder === 'asc' ? 1 : -1;

          // Compare values
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            const comparison = aValue.localeCompare(bValue);
            return sortOrder === 'asc' ? comparison : -comparison;
          }

          if (typeof aValue === 'number' && typeof bValue === 'number') {
            const comparison = aValue - bValue;
            return sortOrder === 'asc' ? comparison : -comparison;
          }

          // Fallback to string comparison
          const aStr = String(aValue);
          const bStr = String(bValue);
          const comparison = aStr.localeCompare(bStr);
          return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
      },

      // Get result by filename
      getResultByFilename: (filename: string) => {
        return get().results.find(result => result.filename === filename);
      },
    }),
    {
      name: 'results-store',
      partialize: (state) => ({
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        searchTerm: state.searchTerm,
      }),
    },
  ),
);
