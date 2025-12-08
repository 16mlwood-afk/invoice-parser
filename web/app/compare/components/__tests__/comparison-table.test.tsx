import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComparisonTable } from '../comparison-table';

// Mock the store
jest.mock('@/stores/comparison-store', () => ({
  useComparisonStore: jest.fn(),
}));

import { useComparisonStore } from '@/stores/comparison-store';

const mockUseComparisonStore = useComparisonStore as jest.MockedFunction<typeof useComparisonStore>;

describe('ComparisonTable', () => {
  const mockComparison = {
    jobIds: ['job1', 'job2'],
    results: [
      {
        field: 'vendor',
        values: [
          { invoiceId: 'job1', value: 'ABC Corp', confidence: 0.9, source: 'extracted' },
          { invoiceId: 'job2', value: 'ABC Corp', confidence: 0.8, source: 'extracted' },
        ],
        hasDifferences: false,
        confidence: 0.85,
        issues: [],
      },
      {
        field: 'total',
        values: [
          { invoiceId: 'job1', value: 100.00, confidence: 0.9, source: 'extracted' },
          { invoiceId: 'job2', value: 150.00, confidence: 0.7, source: 'extracted' },
        ],
        hasDifferences: true,
        confidence: 0.8,
        issues: [
          {
            type: 'difference',
            severity: 'high',
            message: 'Large numeric difference',
            affectedInvoices: ['job1', 'job2'],
          },
        ],
      },
    ],
    summary: {
      totalFields: 2,
      fieldsWithDifferences: 1,
      totalIssues: 1,
      averageConfidence: 0.825,
    },
    generatedAt: new Date(),
  };

  const mockStore = {
    getFilteredResults: jest.fn(() => mockComparison.results),
    currentComparison: mockComparison,
    toggleFieldExpansion: jest.fn(),
    expandedFields: new Set(),
  };

  beforeEach(() => {
    mockUseComparisonStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render table with correct headers', () => {
    render(<ComparisonTable />);

    expect(screen.getByText('Field')).toBeInTheDocument();
    expect(screen.getByText('Invoice 1')).toBeInTheDocument();
    expect(screen.getByText('Invoice 2')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('should display job ID abbreviations', () => {
    render(<ComparisonTable />);

    expect(screen.getByLabelText('Job ID ending in job1')).toBeInTheDocument();
    expect(screen.getByLabelText('Job ID ending in job2')).toBeInTheDocument();
  });

  it('should render field data correctly', () => {
    render(<ComparisonTable />);

    expect(screen.getByText('vendor')).toBeInTheDocument();
    expect(screen.getByText('total')).toBeInTheDocument();
    expect(screen.getAllByText('ABC Corp')).toHaveLength(2); // Both invoices
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should display confidence indicators', () => {
    render(<ComparisonTable />);

    // Check for multiple 90% indicators (vendor field)
    const ninetyPercentIndicators = screen.getAllByText('90%');
    expect(ninetyPercentIndicators).toHaveLength(2); // vendor job1 and total job1

    expect(screen.getByText('80%')).toBeInTheDocument(); // vendor job2
    expect(screen.getByText('70%')).toBeInTheDocument(); // total job2
  });

  it('should show difference highlighting', () => {
    render(<ComparisonTable />);

    // The row with differences should have red background
    const totalRow = screen.getByText('total').closest('tr');
    expect(totalRow).toHaveClass('border-red-300', 'bg-red-50');

    // The row without differences should have green background
    const vendorRow = screen.getByText('vendor').closest('tr');
    expect(vendorRow).toHaveClass('border-green-300', 'bg-green-50');
  });

  it('should display status badges correctly', () => {
    render(<ComparisonTable />);

    expect(screen.getByText('Differences')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText('No Issues')).toBeInTheDocument();
  });

  it('should show expandable indicators', () => {
    render(<ComparisonTable />);

    const expandButtons = screen.getAllByLabelText(/Collapse|Expand/);
    expect(expandButtons).toHaveLength(2);
  });

  it('should toggle field expansion on button click', () => {
    render(<ComparisonTable />);

    const expandButton = screen.getAllByLabelText('Expand details')[0];
    fireEvent.click(expandButton);

    expect(mockStore.toggleFieldExpansion).toHaveBeenCalledWith('vendor');
  });

  it('should handle keyboard navigation', () => {
    render(<ComparisonTable />);

    const table = screen.getByRole('table');
    fireEvent.keyDown(table, { key: 'Enter' });

    // Should not call toggleFieldExpansion since no specific row is targeted
    expect(mockStore.toggleFieldExpansion).not.toHaveBeenCalled();
  });

  it('should display issues count for fields with issues', () => {
    render(<ComparisonTable />);

    expect(screen.getByText('1 issue')).toBeInTheDocument();
  });

  it('should show source information', () => {
    render(<ComparisonTable />);

    expect(screen.getAllByText('extracted')).toHaveLength(4); // 2 fields × 2 invoices
  });

  it('should handle missing comparison data', () => {
    mockUseComparisonStore.mockReturnValue({
      ...mockStore,
      currentComparison: null,
      getFilteredResults: () => [],
    });

    render(<ComparisonTable />);

    expect(screen.getByText('No fields match the current filters')).toBeInTheDocument();
  });

  it('should handle empty filtered results', () => {
    mockUseComparisonStore.mockReturnValue({
      ...mockStore,
      getFilteredResults: () => [],
    });

    render(<ComparisonTable />);

    expect(screen.getByText('No fields match the current filters')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<ComparisonTable />);

    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('aria-label', 'Comparison of 2 invoices');

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1); // Header + data rows

    // Check expandable rows have proper attributes
    const firstDataRow = rows[1];
    expect(firstDataRow).toHaveAttribute('aria-expanded', 'false');
    expect(firstDataRow).toHaveAttribute('aria-level', '1');
  });

  it('should handle single invoice comparison', () => {
    const singleInvoiceComparison = {
      ...mockComparison,
      jobIds: ['job1'],
      results: [
        {
          field: 'vendor',
          values: [
            { invoiceId: 'job1', value: 'ABC Corp', confidence: 0.9, source: 'extracted' },
          ],
          hasDifferences: false,
          confidence: 0.9,
          issues: [],
        },
      ],
    };

    mockUseComparisonStore.mockReturnValue({
      ...mockStore,
      currentComparison: singleInvoiceComparison,
      getFilteredResults: () => singleInvoiceComparison.results,
    });

    render(<ComparisonTable />);

    expect(screen.getByText('Invoice 1')).toBeInTheDocument();
    expect(screen.queryByText('Invoice 2')).not.toBeInTheDocument();
  });
});