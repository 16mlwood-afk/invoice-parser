import { render, screen, fireEvent, within } from '@testing-library/react';
import { ResultsTable } from '../results-table';
import { useResultsStore } from '@/stores/results-store';

// Mock the store
jest.mock('@/stores/results-store');
const mockUseResultsStore = useResultsStore as jest.MockedFunction<typeof useResultsStore>;

describe('ResultsTable', () => {
  const mockResults = [
    {
      filename: 'invoice1.pdf',
      orderNumber: 'ORD-001',
      orderDate: '2024-01-15',
      customerInfo: { name: 'John Doe', email: 'john@example.com' },
      items: [
        { description: 'Item 1', quantity: 2, unitPrice: 10.99, total: 21.98 },
      ],
      totals: { subtotal: 21.98, tax: 2.20, total: 24.18 },
      currency: 'USD',
      validationStatus: 'valid' as const,
      validationErrors: [],
    },
    {
      filename: 'invoice2.pdf',
      orderNumber: 'ORD-002',
      orderDate: '2024-01-16',
      customerInfo: { name: 'Jane Smith' },
      items: [],
      totals: { total: 15.50 },
      currency: 'EUR',
      validationStatus: 'warning' as const,
      validationErrors: ['Missing tax information'],
    },
  ];

  beforeEach(() => {
    mockUseResultsStore.mockReturnValue({
      sortBy: 'filename',
      sortOrder: 'asc',
      searchTerm: '',
      setSortBy: jest.fn(),
      toggleSortOrder: jest.fn(),
      setSearchTerm: jest.fn(),
      getFilteredResults: jest.fn().mockReturnValue(mockResults),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with results', () => {
    render(<ResultsTable results={mockResults} />);

    expect(screen.getByText('invoice1.pdf')).toBeInTheDocument();
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('$24.18')).toBeInTheDocument();
  });

  it('displays validation status indicators', () => {
    render(<ResultsTable results={mockResults} />);

    const validBadge = screen.getByText('valid');
    const warningBadge = screen.getByText('warning');

    expect(validBadge).toHaveClass('text-green-700', 'bg-green-100');
    expect(warningBadge).toHaveClass('text-yellow-700', 'bg-yellow-100');
  });

  it('shows search input', () => {
    render(<ResultsTable results={mockResults} />);

    const searchInput = screen.getByPlaceholderText('Search invoices...');
    expect(searchInput).toBeInTheDocument();
  });

  it('handles search input changes', () => {
    const mockSetSearchTerm = jest.fn();
    mockUseResultsStore.mockReturnValue({
      sortBy: 'filename',
      sortOrder: 'asc',
      searchTerm: '',
      setSortBy: jest.fn(),
      toggleSortOrder: jest.fn(),
      setSearchTerm: mockSetSearchTerm,
      getFilteredResults: jest.fn().mockReturnValue(mockResults),
    });

    render(<ResultsTable results={mockResults} />);

    const searchInput = screen.getByPlaceholderText('Search invoices...');
    fireEvent.change(searchInput, { target: { value: 'invoice1' } });

    expect(mockSetSearchTerm).toHaveBeenCalledWith('invoice1');
  });

  it('displays sortable column headers', () => {
    render(<ResultsTable results={mockResults} />);

    expect(screen.getByText('Filename')).toBeInTheDocument();
    expect(screen.getByText('Order Number')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
  });

  it('handles column sorting', () => {
    const mockSetSortBy = jest.fn();
    const mockToggleSortOrder = jest.fn();
    mockUseResultsStore.mockReturnValue({
      sortBy: 'filename',
      sortOrder: 'asc',
      searchTerm: '',
      setSortBy: mockSetSortBy,
      toggleSortOrder: mockToggleSortOrder,
      setSearchTerm: jest.fn(),
      getFilteredResults: jest.fn().mockReturnValue(mockResults),
    });

    render(<ResultsTable results={mockResults} />);

    const filenameHeader = screen.getByText('Filename');
    fireEvent.click(filenameHeader);

    expect(mockSetSortBy).toHaveBeenCalledWith('filename');
  });

  it('toggles row expansion', () => {
    render(<ResultsTable results={mockResults} />);

    const expandButton = screen.getByLabelText('Expand invoice1.pdf details');
    expect(expandButton).toBeInTheDocument();

    fireEvent.click(expandButton);

    expect(screen.getByLabelText('Collapse invoice1.pdf details')).toBeInTheDocument();
  });

  it('shows expanded row content', () => {
    render(<ResultsTable results={mockResults} />);

    const expandButton = screen.getByLabelText('Expand invoice1.pdf details');
    fireEvent.click(expandButton);

    expect(screen.getByText('Raw Data (JSON)')).toBeInTheDocument();
    expect(screen.getByText(/invoice1\.pdf/)).toBeInTheDocument();
  });

  it('displays item details in expanded row', () => {
    render(<ResultsTable results={mockResults} />);

    const expandButton = screen.getByLabelText('Expand invoice1.pdf details');
    fireEvent.click(expandButton);

    expect(screen.getByText('Items (1)')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('$10.99')).toBeInTheDocument();
  });

  it('shows validation errors in expanded row', () => {
    render(<ResultsTable results={mockResults} />);

    const expandButton = screen.getByLabelText('Expand invoice2.pdf details');
    fireEvent.click(expandButton);

    expect(screen.getByText('Validation Errors')).toBeInTheDocument();
    expect(screen.getByText('Missing tax information')).toBeInTheDocument();
  });

  it('displays result count', () => {
    render(<ResultsTable results={mockResults} />);

    expect(screen.getByText('Showing 2 of 2 results')).toBeInTheDocument();
  });

  it('handles empty search results', () => {
    mockUseResultsStore.mockReturnValue({
      sortBy: 'filename',
      sortOrder: 'asc',
      searchTerm: 'nonexistent',
      setSortBy: jest.fn(),
      toggleSortOrder: jest.fn(),
      setSearchTerm: jest.fn(),
      getFilteredResults: jest.fn().mockReturnValue([]),
    });

    render(<ResultsTable results={mockResults} />);

    expect(screen.getByText('No results match your search criteria.')).toBeInTheDocument();
    expect(screen.getByText('Clear Search')).toBeInTheDocument();
  });
});
