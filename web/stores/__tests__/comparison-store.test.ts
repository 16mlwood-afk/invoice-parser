import { useComparisonStore } from '../comparison-store';

// Mock the API client
jest.mock('@/src/lib/api/comparison', () => ({
  performComparison: jest.fn(),
}));

import { performComparison } from '@/lib/api/comparison';

const mockPerformComparison = performComparison as jest.MockedFunction<typeof performComparison>;

describe('Comparison Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    useComparisonStore.setState({
      currentComparison: null,
      selectedJobIds: [],
      comparisonOptions: {
        selectedFields: ['orderNumber', 'orderDate', 'subtotal', 'tax', 'total', 'vendor'],
        confidenceThreshold: 0.7,
        includeValidationIssues: true,
      },
      isLoading: false,
      error: null,
      sortBy: 'field',
      sortOrder: 'asc',
      searchTerm: '',
      expandedFields: new Set(),
    });
    jest.clearAllMocks();
  });

  describe('performComparison', () => {
    it('should set loading state and call API', async () => {
      const mockResponse = {
        success: true,
        data: {
          jobIds: ['job1', 'job2'],
          results: [],
          summary: {
            totalFields: 0,
            fieldsWithDifferences: 0,
            totalIssues: 0,
            averageConfidence: 0,
          },
          generatedAt: new Date(),
        },
      };

      mockPerformComparison.mockResolvedValue(mockResponse);

      const { performComparison } = useComparisonStore.getState();

      const promise = performComparison(['job1', 'job2']);

      // Check loading state
      expect(useComparisonStore.getState().isLoading).toBe(true);
      expect(useComparisonStore.getState().error).toBe(null);

      await promise;

      expect(mockPerformComparison).toHaveBeenCalledWith(['job1', 'job2'], expect.any(Object));
      expect(useComparisonStore.getState().isLoading).toBe(false);
      expect(useComparisonStore.getState().currentComparison).toEqual(mockResponse.data);
      expect(useComparisonStore.getState().selectedJobIds).toEqual(['job1', 'job2']);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Comparison failed');
      mockPerformComparison.mockRejectedValue(mockError);

      const { performComparison } = useComparisonStore.getState();

      await performComparison(['job1', 'job2']);

      expect(useComparisonStore.getState().isLoading).toBe(false);
      expect(useComparisonStore.getState().error).toBe('Comparison failed');
      expect(useComparisonStore.getState().currentComparison).toBe(null);
    });

    it('should handle API response errors', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid job IDs',
      };

      mockPerformComparison.mockResolvedValue(mockResponse);

      const { performComparison } = useComparisonStore.getState();

      await performComparison(['invalid-job']);

      expect(useComparisonStore.getState().isLoading).toBe(false);
      expect(useComparisonStore.getState().error).toBe('Invalid job IDs');
    });

    it('should update comparison options when provided', async () => {
      const mockResponse = {
        success: true,
        data: {
          jobIds: ['job1', 'job2'],
          results: [],
          summary: {
            totalFields: 0,
            fieldsWithDifferences: 0,
            totalIssues: 0,
            averageConfidence: 0,
          },
          generatedAt: new Date(),
        },
      };

      mockPerformComparison.mockResolvedValue(mockResponse);

      const { performComparison } = useComparisonStore.getState();

      const newOptions = {
        confidenceThreshold: 0.8,
        selectedFields: ['total', 'vendor'],
      };

      await performComparison(['job1', 'job2'], newOptions);

      expect(useComparisonStore.getState().comparisonOptions.confidenceThreshold).toBe(0.8);
      expect(useComparisonStore.getState().comparisonOptions.selectedFields).toEqual(['total', 'vendor']);
    });
  });

  describe('exportComparison', () => {
    beforeEach(() => {
      // Set up a mock comparison
      useComparisonStore.setState({
        currentComparison: {
          jobIds: ['job1', 'job2'],
          results: [],
          summary: {
            totalFields: 0,
            fieldsWithDifferences: 0,
            totalIssues: 0,
            averageConfidence: 0,
          },
          generatedAt: new Date(),
        },
      });

      // Mock URL and Blob
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();

      // Mock document methods
      document.createElement = jest.fn().mockReturnValue({
        click: jest.fn(),
        href: '',
        download: '',
      });
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();
    });

    it('should export JSON format', async () => {
      const { exportComparison } = useComparisonStore.getState();

      await exportComparison('json');

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
    });

    it('should export CSV format', async () => {
      const { exportComparison } = useComparisonStore.getState();

      await exportComparison('csv');

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should handle missing comparison data', async () => {
      useComparisonStore.setState({ currentComparison: null });

      const { exportComparison } = useComparisonStore.getState();

      await exportComparison('json');

      expect(useComparisonStore.getState().error).toBe('No comparison data available for export');
    });
  });

  describe('state management', () => {
    it('should update selected job IDs', () => {
      const { setSelectedJobIds } = useComparisonStore.getState();

      setSelectedJobIds(['job1', 'job2', 'job3']);

      expect(useComparisonStore.getState().selectedJobIds).toEqual(['job1', 'job2', 'job3']);
    });

    it('should update comparison options', () => {
      const { setComparisonOptions } = useComparisonStore.getState();

      setComparisonOptions({
        confidenceThreshold: 0.9,
        includeValidationIssues: false,
      });

      expect(useComparisonStore.getState().comparisonOptions.confidenceThreshold).toBe(0.9);
      expect(useComparisonStore.getState().comparisonOptions.includeValidationIssues).toBe(false);
    });

    it('should toggle sort order', () => {
      const { toggleSortOrder } = useComparisonStore.getState();

      expect(useComparisonStore.getState().sortOrder).toBe('asc');

      toggleSortOrder();
      expect(useComparisonStore.getState().sortOrder).toBe('desc');

      toggleSortOrder();
      expect(useComparisonStore.getState().sortOrder).toBe('asc');
    });

    it('should update sort field', () => {
      const { setSortBy } = useComparisonStore.getState();

      setSortBy('confidence');
      expect(useComparisonStore.getState().sortBy).toBe('confidence');

      setSortBy('differences');
      expect(useComparisonStore.getState().sortBy).toBe('differences');
    });

    it('should update search term', () => {
      const { setSearchTerm } = useComparisonStore.getState();

      setSearchTerm('test search');
      expect(useComparisonStore.getState().searchTerm).toBe('test search');
    });

    it('should toggle field expansion', () => {
      const { toggleFieldExpansion } = useComparisonStore.getState();

      toggleFieldExpansion('vendor');
      expect(useComparisonStore.getState().expandedFields.has('vendor')).toBe(true);

      toggleFieldExpansion('vendor');
      expect(useComparisonStore.getState().expandedFields.has('vendor')).toBe(false);
    });

    it('should clear comparison', () => {
      // Set up some state
      useComparisonStore.setState({
        currentComparison: {
          jobIds: ['job1'],
          results: [],
          summary: {
            totalFields: 1,
            fieldsWithDifferences: 0,
            totalIssues: 0,
            averageConfidence: 0.8,
          },
          generatedAt: new Date(),
        },
        selectedJobIds: ['job1', 'job2'],
        error: 'test error',
        searchTerm: 'test',
        expandedFields: new Set(['vendor']),
      });

      const { clearComparison } = useComparisonStore.getState();

      clearComparison();

      const state = useComparisonStore.getState();
      expect(state.currentComparison).toBe(null);
      expect(state.selectedJobIds).toEqual([]);
      expect(state.error).toBe(null);
      expect(state.searchTerm).toBe('');
      expect(state.expandedFields.size).toBe(0);
    });
  });

  describe('getFilteredResults', () => {
    beforeEach(() => {
      const mockComparison = {
        jobIds: ['job1', 'job2'],
        results: [
          {
            field: 'vendor',
            values: [],
            hasDifferences: false,
            confidence: 0.9,
            issues: [],
          },
          {
            field: 'total',
            values: [],
            hasDifferences: true,
            confidence: 0.8,
            issues: [{ type: 'difference', severity: 'high', message: 'Large difference', affectedInvoices: ['job1'] }],
          },
        ],
        summary: {
          totalFields: 2,
          fieldsWithDifferences: 1,
          totalIssues: 1,
          averageConfidence: 0.85,
        },
        generatedAt: new Date(),
      };

      useComparisonStore.setState({ currentComparison: mockComparison });
    });

    it('should return all results when no filters applied', () => {
      const { getFilteredResults } = useComparisonStore.getState();
      const results = getFilteredResults();

      expect(results).toHaveLength(2);
    });

    it('should filter by search term', () => {
      const { setSearchTerm, getFilteredResults } = useComparisonStore.getState();

      setSearchTerm('vendor');
      const results = getFilteredResults();

      expect(results).toHaveLength(1);
      expect(results[0].field).toBe('vendor');
    });

    it('should sort by field name ascending', () => {
      const { setSortBy, getFilteredResults } = useComparisonStore.getState();

      setSortBy('field');
      const results = getFilteredResults();

      expect(results[0].field).toBe('total'); // 't' comes before 'v'
      expect(results[1].field).toBe('vendor');
    });

    it('should sort by confidence descending', () => {
      const { setSortBy, toggleSortOrder, getFilteredResults } = useComparisonStore.getState();

      setSortBy('confidence');
      toggleSortOrder(); // Set to descending
      const results = getFilteredResults();

      expect(results[0].confidence).toBe(0.9); // vendor has higher confidence
      expect(results[1].confidence).toBe(0.8);
    });

    it('should sort by differences', () => {
      const { setSortBy, getFilteredResults } = useComparisonStore.getState();

      setSortBy('differences');
      const results = getFilteredResults();

      expect(results[0].field).toBe('total'); // has differences (true comes first)
      expect(results[1].field).toBe('vendor');
    });

    it('should return empty array when no comparison data', () => {
      useComparisonStore.setState({ currentComparison: null });

      const { getFilteredResults } = useComparisonStore.getState();
      const results = getFilteredResults();

      expect(results).toEqual([]);
    });
  });
});