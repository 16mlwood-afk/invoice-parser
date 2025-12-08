import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ComparisonPage from '@/app/compare/page';

// Mock the components
jest.mock('@/app/compare/components/comparison-summary', () => ({
  ComparisonSummary: () => <div data-testid="comparison-summary">Comparison Summary</div>,
}));

jest.mock('@/app/compare/components/comparison-filters', () => ({
  ComparisonFilters: () => <div data-testid="comparison-filters">Comparison Filters</div>,
}));

jest.mock('@/app/compare/components/comparison-export', () => ({
  ComparisonExport: () => <div data-testid="comparison-export">Comparison Export</div>,
}));

jest.mock('@/app/compare/components/comparison-table', () => ({
  ComparisonTable: () => <div data-testid="comparison-table">Comparison Table</div>,
}));

// Mock the store
jest.mock('@/stores/comparison-store', () => ({
  useComparisonStore: jest.fn(),
}));

// Mock the layout
jest.mock('@/components/layout', () => ({
  Header: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <header data-testid="header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  ),
}));

import { useComparisonStore } from '@/stores/comparison-store';

const mockUseComparisonStore = useComparisonStore as jest.MockedFunction<typeof useComparisonStore>;

describe('ComparisonPage Integration', () => {
  const mockStore = {
    currentComparison: null,
    selectedJobIds: [],
    isLoading: false,
    error: null,
    performComparison: jest.fn(),
    clearComparison: jest.fn(),
  };

  beforeEach(() => {
    mockUseComparisonStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the comparison page layout', () => {
    render(<ComparisonPage />);

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByText('Invoice Comparison')).toBeInTheDocument();
    expect(screen.getByText('Compare data across multiple processed invoices')).toBeInTheDocument();
    expect(screen.getByText('Select Invoices to Compare')).toBeInTheDocument();
  });

  it('should show breadcrumb navigation', () => {
    render(<ComparisonPage />);

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Upload Files')).toBeInTheDocument();
    expect(screen.getByText('Invoice Comparison')).toBeInTheDocument();
  });

  it('should render job ID input fields', () => {
    render(<ComparisonPage />);

    expect(screen.getByLabelText('Job ID 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Job ID 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Job ID 3')).toBeInTheDocument();
  });

  it('should allow adding more job ID inputs', () => {
    render(<ComparisonPage />);

    const addButton = screen.getByText('Add Another Job ID');
    expect(addButton).toBeInTheDocument();

    fireEvent.click(addButton);

    expect(screen.getByLabelText('Job ID 4')).toBeInTheDocument();
  });

  it('should allow removing job ID inputs when more than 2', () => {
    render(<ComparisonPage />);

    // Add a fourth input first
    const addButton = screen.getByText('Add Another Job ID');
    fireEvent.click(addButton);

    const removeButton = screen.getAllByLabelText('')[0]; // Remove button for first input
    fireEvent.click(removeButton);

    expect(screen.queryByLabelText('Job ID 1')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Job ID 2')).toBeInTheDocument();
  });

  it('should validate minimum job IDs before comparison', () => {
    render(<ComparisonPage />);

    const compareButton = screen.getByText('Compare Invoices');
    expect(compareButton).toBeDisabled();

    // Enter one job ID
    const jobIdInput = screen.getByLabelText('Job ID 1');
    fireEvent.change(jobIdInput, { target: { value: 'job1' } });

    expect(compareButton).toBeDisabled();

    // Enter second job ID
    const jobIdInput2 = screen.getByLabelText('Job ID 2');
    fireEvent.change(jobIdInput2, { target: { value: 'job2' } });

    expect(compareButton).not.toBeDisabled();
  });

  it('should call performComparison when form is submitted', () => {
    render(<ComparisonPage />);

    const jobIdInput1 = screen.getByLabelText('Job ID 1');
    const jobIdInput2 = screen.getByLabelText('Job ID 2');
    const compareButton = screen.getByText('Compare Invoices');

    fireEvent.change(jobIdInput1, { target: { value: 'job1' } });
    fireEvent.change(jobIdInput2, { target: { value: 'job2' } });
    fireEvent.click(compareButton);

    expect(mockStore.performComparison).toHaveBeenCalledWith(['job1', 'job2']);
  });

  it('should show loading state during comparison', () => {
    mockUseComparisonStore.mockReturnValue({
      ...mockStore,
      isLoading: true,
    });

    render(<ComparisonPage />);

    expect(screen.getByText('Comparing...')).toBeInTheDocument();
    expect(screen.getByText('Comparing invoices...')).toBeInTheDocument();
  });

  it('should show error state when comparison fails', () => {
    mockUseComparisonStore.mockReturnValue({
      ...mockStore,
      error: 'Comparison failed: Invalid job ID',
    });

    render(<ComparisonPage />);

    expect(screen.getByText('Comparison Error')).toBeInTheDocument();
    expect(screen.getByText('Comparison failed: Invalid job ID')).toBeInTheDocument();
    expect(screen.getByText('Retry Comparison')).toBeInTheDocument();
  });

  it('should show comparison results when available', () => {
    const mockComparison = {
      jobIds: ['job1', 'job2'],
      results: [],
      summary: {
        totalFields: 5,
        fieldsWithDifferences: 2,
        totalIssues: 3,
        averageConfidence: 0.8,
      },
      generatedAt: new Date(),
    };

    mockUseComparisonStore.mockReturnValue({
      ...mockStore,
      currentComparison: mockComparison,
    });

    render(<ComparisonPage />);

    expect(screen.getByTestId('comparison-summary')).toBeInTheDocument();
    expect(screen.getByTestId('comparison-filters')).toBeInTheDocument();
    expect(screen.getByTestId('comparison-export')).toBeInTheDocument();
    expect(screen.getByTestId('comparison-table')).toBeInTheDocument();
  });

  it('should show empty state when no comparison data', () => {
    render(<ComparisonPage />);

    expect(screen.getByText('No Comparison Data')).toBeInTheDocument();
    expect(screen.getByText('Select multiple job IDs above and click "Compare Invoices" to start comparing invoice data.')).toBeInTheDocument();
    expect(screen.getByText('View Processing Jobs')).toBeInTheDocument();
    expect(screen.getByText('Upload Files')).toBeInTheDocument();
  });

  it('should clear comparison and reset form', () => {
    // Set up with some data
    mockUseComparisonStore.mockReturnValue({
      ...mockStore,
      selectedJobIds: ['job1', 'job2'],
    });

    render(<ComparisonPage />);

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    expect(mockStore.clearComparison).toHaveBeenCalled();
  });

  it('should handle job ID input changes', () => {
    render(<ComparisonPage />);

    const jobIdInput = screen.getByLabelText('Job ID 1');
    fireEvent.change(jobIdInput, { target: { value: 'test-job-id' } });

    expect(jobIdInput).toHaveValue('test-job-id');
  });

  it('should show correct count of invoices being compared', () => {
    render(<ComparisonPage />);

    expect(screen.getByText('Comparing 0 invoices')).toBeInTheDocument();

    const jobIdInput1 = screen.getByLabelText('Job ID 1');
    const jobIdInput2 = screen.getByLabelText('Job ID 2');

    fireEvent.change(jobIdInput1, { target: { value: 'job1' } });
    expect(screen.getByText('Comparing 1 invoices')).toBeInTheDocument();

    fireEvent.change(jobIdInput2, { target: { value: 'job2' } });
    expect(screen.getByText('Comparing 2 invoices')).toBeInTheDocument();
  });

  it('should have proper form accessibility', () => {
    render(<ComparisonPage />);

    const jobIdInput = screen.getByLabelText('Job ID 1');
    expect(jobIdInput).toHaveAttribute('placeholder', 'e.g., abc123-def456');

    const compareButton = screen.getByText('Compare Invoices');
    expect(compareButton).toHaveAttribute('disabled');
  });

  it('should render help text container', () => {
    render(<ComparisonPage />);

    expect(screen.getByText('Select Invoices to Compare')).toBeInTheDocument();
  });
});