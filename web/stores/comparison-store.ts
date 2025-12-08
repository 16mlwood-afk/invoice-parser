import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Export helper functions
async function exportAsJSON(comparison: ComparisonReport) {
  const dataStr = JSON.stringify(comparison, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  downloadBlob(dataBlob, `invoice-comparison-${Date.now()}.json`);
}

async function exportAsCSV(comparison: ComparisonReport) {
  const csvRows: string[] = [];

  // Header row
  const headers = ['Field', 'Has Differences', 'Confidence'];
  comparison.jobIds.forEach(jobId => {
    headers.push(`${jobId} Value`);
    headers.push(`${jobId} Confidence`);
  });
  headers.push('Issues');
  csvRows.push(headers.map(escapeCSV).join(','));

  // Data rows
  comparison.results.forEach(result => {
    const row: string[] = [
      result.field,
      result.hasDifferences.toString(),
      result.confidence.toString(),
    ];

    // Add values for each invoice
    result.values.forEach(value => {
      row.push(value.value?.toString() || '');
      row.push(value.confidence.toString());
    });

    // Add issues summary
    const issuesSummary = result.issues.map(issue => `${issue.type}: ${issue.message}`).join('; ');
    row.push(issuesSummary);

    csvRows.push(row.map(escapeCSV).join(','));
  });

  const csvContent = csvRows.join('\n');
  const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(csvBlob, `invoice-comparison-${Date.now()}.csv`);
}

async function exportAsPDF(comparison: ComparisonReport) {
  // For now, we'll export as JSON since PDF generation would require additional libraries
  // In a real implementation, you would use a library like jsPDF or similar
  console.warn('PDF export not yet implemented, exporting as JSON instead');
  await exportAsJSON(comparison);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Comparison-specific types based on the story
export interface ComparisonValue {
  invoiceId: string;
  value: any;
  confidence: number;
  source: 'extracted' | 'calculated';
}

export interface ComparisonIssue {
  type: 'difference' | 'missing' | 'inconsistent';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedInvoices: string[];
}

export interface ComparisonResult {
  field: string;
  values: ComparisonValue[];
  hasDifferences: boolean;
  confidence: number;
  issues: ComparisonIssue[];
}

export interface ComparisonReport {
  jobIds: string[];
  results: ComparisonResult[];
  summary: {
    totalFields: number;
    fieldsWithDifferences: number;
    totalIssues: number;
    averageConfidence: number;
  };
  generatedAt: Date;
}

interface ComparisonState {
  // Current comparison data
  currentComparison: ComparisonReport | null;
  selectedJobIds: string[];
  comparisonOptions: {
    selectedFields: string[];
    confidenceThreshold: number;
    includeValidationIssues: boolean;
  };

  // UI state
  isLoading: boolean;
  error: string | null;
  sortBy: 'field' | 'confidence' | 'differences';
  sortOrder: 'asc' | 'desc';
  searchTerm: string;
  expandedFields: Set<string>;

  // Actions
  loadInvoicesForComparison: (jobIds: string[]) => Promise<void>;
  performComparison: (jobIds: string[], options?: Partial<ComparisonState['comparisonOptions']>) => Promise<void>;
  exportComparison: (format: 'json' | 'csv' | 'pdf') => Promise<void>;
  setSelectedJobIds: (jobIds: string[]) => void;
  setComparisonOptions: (options: Partial<ComparisonState['comparisonOptions']>) => void;
  setSortBy: (field: 'field' | 'confidence' | 'differences') => void;
  toggleSortOrder: () => void;
  setSearchTerm: (term: string) => void;
  toggleFieldExpansion: (field: string) => void;
  clearComparison: () => void;
  getFilteredResults: () => ComparisonResult[];
}

export const useComparisonStore = create<ComparisonState>()(
  persist(
    (set, get) => ({
      // Initial state
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

      // Load invoices for comparison
      loadInvoicesForComparison: async (jobIds: string[]) => {
        set({ selectedJobIds: jobIds });
        // This will be implemented when we create the API client
      },

      // Perform comparison
      performComparison: async (jobIds: string[], options?: Partial<ComparisonState['comparisonOptions']>) => {
        set({ isLoading: true, error: null });

        try {
          // Update options if provided
          if (options) {
            set((state) => ({
              comparisonOptions: { ...state.comparisonOptions, ...options },
            }));
          }

          // Import API client dynamically to avoid circular dependencies
          const { performComparison: apiPerformComparison } = await import('@/lib/api/comparison');

          const response = await apiPerformComparison(jobIds, get().comparisonOptions);

          if (response.success && response.data) {
            set({
              currentComparison: response.data,
              selectedJobIds: jobIds,
              isLoading: false,
            });
          } else {
            throw new Error(response.error || 'Comparison failed');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Comparison failed',
            isLoading: false,
          });
        }
      },

      // Export comparison results
      exportComparison: async (format: 'json' | 'csv' | 'pdf') => {
        const { currentComparison } = get();
        if (!currentComparison) {
          set({ error: 'No comparison data available for export' });
          return;
        }

        try {
          switch (format) {
            case 'json':
              await exportAsJSON(currentComparison);
              break;
            case 'csv':
              await exportAsCSV(currentComparison);
              break;
            case 'pdf':
              await exportAsPDF(currentComparison);
              break;
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Export failed',
          });
        }
      },

      // State setters
      setSelectedJobIds: (jobIds: string[]) => {
        set({ selectedJobIds: jobIds });
      },

      setComparisonOptions: (options: Partial<ComparisonState['comparisonOptions']>) => {
        set((state) => ({
          comparisonOptions: { ...state.comparisonOptions, ...options },
        }));
      },

      setSortBy: (field: 'field' | 'confidence' | 'differences') => {
        set({ sortBy: field });
      },

      toggleSortOrder: () => {
        set((state) => ({
          sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc',
        }));
      },

      setSearchTerm: (term: string) => {
        set({ searchTerm: term });
      },

      toggleFieldExpansion: (field: string) => {
        set((state) => {
          const newExpanded = new Set(state.expandedFields);
          if (newExpanded.has(field)) {
            newExpanded.delete(field);
          } else {
            newExpanded.add(field);
          }
          return { expandedFields: newExpanded };
        });
      },

      clearComparison: () => {
        set({
          currentComparison: null,
          selectedJobIds: [],
          error: null,
          searchTerm: '',
          expandedFields: new Set(),
        });
      },

      // Get filtered and sorted results
      getFilteredResults: () => {
        const { currentComparison, sortBy, sortOrder, searchTerm } = get();

        if (!currentComparison) return [];

        let filtered = currentComparison.results;

        // Filter by search term
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(result =>
            result.field.toLowerCase().includes(term) ||
            result.issues.some(issue => issue.message.toLowerCase().includes(term))
          );
        }

        // Sort results
        filtered.sort((a, b) => {
          let aValue: any;
          let bValue: any;

          switch (sortBy) {
            case 'field':
              aValue = a.field;
              bValue = b.field;
              break;
            case 'confidence':
              aValue = a.confidence;
              bValue = b.confidence;
              break;
            case 'differences':
              aValue = a.hasDifferences;
              bValue = b.hasDifferences;
              break;
            default:
              return 0;
          }

          // Handle string comparison
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            const comparison = aValue.localeCompare(bValue);
            return sortOrder === 'asc' ? comparison : -comparison;
          }

          // Handle number comparison
          if (typeof aValue === 'number' && typeof bValue === 'number') {
            const comparison = aValue - bValue;
            return sortOrder === 'asc' ? comparison : -comparison;
          }

          // Handle boolean comparison
          if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
            const comparison = aValue === bValue ? 0 : (aValue ? -1 : 1);
            return sortOrder === 'asc' ? comparison : -comparison;
          }

          return 0;
        });

        return filtered;
      },
    }),
    {
      name: 'comparison-store',
      partialize: (state) => ({
        comparisonOptions: state.comparisonOptions,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        searchTerm: state.searchTerm,
      }),
    },
  ),
);