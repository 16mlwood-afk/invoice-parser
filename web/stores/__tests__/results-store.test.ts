import { act, renderHook } from '@testing-library/react';
import { useResultsStore } from '../results-store';
import { apiClient } from '@/lib/api-client';

// Mock the API client
jest.mock('@/lib/api-client');
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('useResultsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useResultsStore());
    act(() => {
      result.current.clearResults();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadResults', () => {
    it('loads results successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          jobId: 'job-123',
          status: 'completed',
          summary: {
            totalFiles: 5,
            processedFiles: 5,
            failedFiles: 0,
            successRate: 100,
          },
          results: [
            {
              filename: 'test.pdf',
              orderNumber: 'ORD-001',
              validationStatus: 'valid',
            },
          ],
          errors: [],
        },
      };

      mockApiClient.getResults.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useResultsStore());

      await act(async () => {
        await result.current.loadResults('job-123');
      });

      expect(result.current.currentJobId).toBe('job-123');
      expect(result.current.jobStatus).toBe('completed');
      expect(result.current.results).toHaveLength(1);
      expect(result.current.summary).toEqual(mockResponse.data.summary);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles loading errors', async () => {
      const mockResponse = {
        success: false,
        error: 'Failed to load results',
      };

      mockApiClient.getResults.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useResultsStore());

      await act(async () => {
        await result.current.loadResults('job-123');
      });

      expect(result.current.jobStatus).toBe('failed');
      expect(result.current.error).toBe('Failed to load results');
      expect(result.current.isLoading).toBe(false);
    });

    it('sets loading state during API call', async () => {
      mockApiClient.getResults.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useResultsStore());

      act(() => {
        result.current.loadResults('job-123');
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('exportResults', () => {
    it('calls API export method', async () => {
      mockApiClient.exportResults.mockResolvedValue(undefined);

      const { result } = renderHook(() => useResultsStore());

      act(() => {
        result.current.currentJobId = 'job-123';
      });

      await act(async () => {
        await result.current.exportResults('json');
      });

      expect(mockApiClient.exportResults).toHaveBeenCalledWith('job-123', 'json');
    });

    it('handles export errors', async () => {
      const error = new Error('Export failed');
      mockApiClient.exportResults.mockRejectedValue(error);

      const { result } = renderHook(() => useResultsStore());

      act(() => {
        result.current.currentJobId = 'job-123';
      });

      await act(async () => {
        await result.current.exportResults('json');
      });

      expect(result.current.error).toBe('Export failed');
    });
  });

  describe('sorting and filtering', () => {
    const mockResults = [
      {
        filename: 'b-file.pdf',
        orderNumber: 'ORD-002',
        validationStatus: 'valid',
      },
      {
        filename: 'a-file.pdf',
        orderNumber: 'ORD-001',
        validationStatus: 'warning',
      },
    ];

    beforeEach(() => {
      const { result } = renderHook(() => useResultsStore());
      act(() => {
        result.current.results = mockResults;
      });
    });

    it('sets sort field', () => {
      const { result } = renderHook(() => useResultsStore());

      act(() => {
        result.current.setSortBy('orderNumber');
      });

      expect(result.current.sortBy).toBe('orderNumber');
    });

    it('toggles sort order', () => {
      const { result } = renderHook(() => useResultsStore());

      act(() => {
        result.current.toggleSortOrder();
      });

      expect(result.current.sortOrder).toBe('desc');

      act(() => {
        result.current.toggleSortOrder();
      });

      expect(result.current.sortOrder).toBe('asc');
    });

    it('filters results by search term', () => {
      const { result } = renderHook(() => useResultsStore());

      act(() => {
        result.current.results = mockResults;
        result.current.setSearchTerm('ORD-001');
      });

      const filtered = result.current.getFilteredResults();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].orderNumber).toBe('ORD-001');
    });

    it('returns all results when no search term', () => {
      const { result } = renderHook(() => useResultsStore());

      act(() => {
        result.current.results = mockResults;
      });

      const filtered = result.current.getFilteredResults();
      expect(filtered).toHaveLength(2);
    });
  });

  describe('getResultByFilename', () => {
    const mockResults = [
      {
        filename: 'test1.pdf',
        orderNumber: 'ORD-001',
        validationStatus: 'valid',
      },
      {
        filename: 'test2.pdf',
        orderNumber: 'ORD-002',
        validationStatus: 'valid',
      },
    ];

    it('returns correct result by filename', () => {
      const { result } = renderHook(() => useResultsStore());

      act(() => {
        result.current.results = mockResults;
      });

      const found = result.current.getResultByFilename('test1.pdf');
      expect(found).toEqual(mockResults[0]);
    });

    it('returns undefined for non-existent filename', () => {
      const { result } = renderHook(() => useResultsStore());

      act(() => {
        result.current.results = mockResults;
      });

      const found = result.current.getResultByFilename('nonexistent.pdf');
      expect(found).toBeUndefined();
    });
  });

  describe('clearResults', () => {
    it('resets all state', () => {
      const { result } = renderHook(() => useResultsStore());

      act(() => {
        result.current.currentJobId = 'job-123';
        result.current.jobStatus = 'completed';
        result.current.results = [{ filename: 'test.pdf', validationStatus: 'valid' }];
        result.current.summary = { totalFiles: 1, processedFiles: 1, failedFiles: 0, successRate: 100 };
        result.current.error = 'Some error';
        result.current.searchTerm = 'test';
      });

      act(() => {
        result.current.clearResults();
      });

      expect(result.current.currentJobId).toBeUndefined();
      expect(result.current.jobStatus).toBe('idle');
      expect(result.current.results).toHaveLength(0);
      expect(result.current.summary).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.searchTerm).toBe('');
    });
  });
});
