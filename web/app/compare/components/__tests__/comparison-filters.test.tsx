import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComparisonFilters } from '../comparison-filters';

// Mock the store
jest.mock('@/stores/comparison-store', () => ({
  useComparisonStore: jest.fn(),
}));

import { useComparisonStore } from '@/stores/comparison-store';

const mockUseComparisonStore = useComparisonStore as jest.MockedFunction<typeof useComparisonStore>;

describe('ComparisonFilters', () => {
  const mockStore = {
    comparisonOptions: {
      selectedFields: ['orderNumber', 'total', 'vendor'],
      confidenceThreshold: 0.7,
      includeValidationIssues: true,
    },
    sortBy: 'field' as const,
    sortOrder: 'asc' as const,
    searchTerm: '',
    performComparison: jest.fn(),
    setComparisonOptions: jest.fn(),
    setSortBy: jest.fn(),
    toggleSortOrder: jest.fn(),
    setSearchTerm: jest.fn(),
    selectedJobIds: ['job1', 'job2'],
  };

  beforeEach(() => {
    mockUseComparisonStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render all filter controls', () => {
    render(<ComparisonFilters />);

    expect(screen.getByText('Comparison Filters & Options')).toBeInTheDocument();
    expect(screen.getByLabelText('Search comparison fields')).toBeInTheDocument();
    expect(screen.getByText('Fields to Compare')).toBeInTheDocument();
    expect(screen.getByText('Minimum Confidence Threshold: 70%')).toBeInTheDocument();
    expect(screen.getByText('Sort Results')).toBeInTheDocument();
  });

  it('should display field checkboxes with correct checked state', () => {
    render(<ComparisonFilters />);

    const orderNumberCheckbox = screen.getByLabelText('Order Number');
    const totalCheckbox = screen.getByLabelText('Total');
    const vendorCheckbox = screen.getByLabelText('Vendor');
    const subtotalCheckbox = screen.getByLabelText('Subtotal');

    expect(orderNumberCheckbox).toBeChecked();
    expect(totalCheckbox).toBeChecked();
    expect(vendorCheckbox).toBeChecked();
    expect(subtotalCheckbox).not.toBeChecked();
  });

  it('should update search term', () => {
    render(<ComparisonFilters />);

    const searchInput = screen.getByLabelText('Search comparison fields');
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    expect(mockStore.setSearchTerm).toHaveBeenCalledWith('test search');
  });

  it('should toggle field selection', () => {
    render(<ComparisonFilters />);

    const subtotalCheckbox = screen.getByLabelText('Subtotal');
    fireEvent.click(subtotalCheckbox);

    expect(mockStore.setComparisonOptions).toHaveBeenCalledWith({
      selectedFields: ['orderNumber', 'total', 'vendor', 'subtotal'],
    });

    // Click again to deselect
    fireEvent.click(subtotalCheckbox);
    expect(mockStore.setComparisonOptions).toHaveBeenCalledWith({
      selectedFields: ['orderNumber', 'total', 'vendor'],
    });
  });

  it('should update confidence threshold', () => {
    render(<ComparisonFilters />);

    const confidenceSlider = screen.getByLabelText('Confidence threshold: 70 percent');
    fireEvent.change(confidenceSlider, { target: { value: '0.8' } });

    expect(mockStore.setComparisonOptions).toHaveBeenCalledWith({
      confidenceThreshold: 0.8,
    });
  });

  it('should toggle validation issues inclusion', () => {
    render(<ComparisonFilters />);

    const validationCheckbox = screen.getByLabelText('Include validation issues in comparison');
    fireEvent.click(validationCheckbox);

    expect(mockStore.setComparisonOptions).toHaveBeenCalledWith({
      includeValidationIssues: false,
    });
  });

  it('should change sort field', () => {
    render(<ComparisonFilters />);

    const sortSelect = screen.getByLabelText('Sort by:');
    fireEvent.change(sortSelect, { target: { value: 'confidence' } });

    expect(mockStore.setSortBy).toHaveBeenCalledWith('confidence');
  });

  it('should toggle sort order', () => {
    render(<ComparisonFilters />);

    const sortOrderButton = screen.getByText('↑ Ascending');
    fireEvent.click(sortOrderButton);

    expect(mockStore.toggleSortOrder).toHaveBeenCalled();
  });

  it('should re-compare with new settings', () => {
    render(<ComparisonFilters />);

    const recompareButton = screen.getByText('Re-compare with New Settings');
    fireEvent.click(recompareButton);

    expect(mockStore.performComparison).toHaveBeenCalledWith(
      ['job1', 'job2'],
      mockStore.comparisonOptions
    );
  });

  it('should display accessibility labels', () => {
    render(<ComparisonFilters />);

    expect(screen.getByLabelText('Search comparison fields')).toBeInTheDocument();
    expect(screen.getByLabelText('Confidence threshold: 70 percent')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(<ComparisonFilters />);

    const searchInput = screen.getByLabelText('Search comparison fields');
    expect(searchInput).toHaveAttribute('aria-describedby');

    const confidenceSlider = screen.getByLabelText('Confidence threshold: 70 percent');
    expect(confidenceSlider).toHaveAttribute('aria-valuemin', '0');
    expect(confidenceSlider).toHaveAttribute('aria-valuemax', '100');
    expect(confidenceSlider).toHaveAttribute('aria-valuenow', '70');
  });

  it('should show current sort order correctly', () => {
    // Test ascending
    render(<ComparisonFilters />);
    expect(screen.getByText('↑ Ascending')).toBeInTheDocument();

    // Test descending
    mockUseComparisonStore.mockReturnValue({
      ...mockStore,
      sortOrder: 'desc',
    });

    render(<ComparisonFilters />);
    expect(screen.getByText('↓ Descending')).toBeInTheDocument();
  });
});