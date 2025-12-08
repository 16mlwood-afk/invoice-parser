import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportControls } from '../export-controls';
import { useResultsStore } from '@/stores/results-store';

// Mock the store
jest.mock('@/stores/results-store');
const mockUseResultsStore = useResultsStore as jest.MockedFunction<typeof useResultsStore>;

describe('ExportControls', () => {
  beforeEach(() => {
    mockUseResultsStore.mockReturnValue({
      exportResults: jest.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders export options', () => {
    render(<ExportControls />);

    expect(screen.getByText('Export Results')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('displays export descriptions', () => {
    render(<ExportControls />);

    expect(screen.getByText('Complete data in JSON format')).toBeInTheDocument();
    expect(screen.getByText('Spreadsheet-compatible format')).toBeInTheDocument();
    expect(screen.getByText('Formatted report document')).toBeInTheDocument();
  });

  it('shows export format icons', () => {
    render(<ExportControls />);

    // Check for SVG elements (icons)
    const svgs = document.querySelectorAll('svg');
    expect(svgs.length).toBe(3); // One for each export format
  });

  it('handles JSON export', async () => {
    const mockExportResults = jest.fn().mockResolvedValue(undefined);
    mockUseResultsStore.mockReturnValue({
      exportResults: mockExportResults,
    });

    render(<ExportControls />);

    const jsonButton = screen.getByText('Export JSON');
    fireEvent.click(jsonButton);

    await waitFor(() => {
      expect(mockExportResults).toHaveBeenCalledWith('json');
    });

    expect(jsonButton).toHaveTextContent('Exporting...');
  });

  it('handles CSV export', async () => {
    const mockExportResults = jest.fn().mockResolvedValue(undefined);
    mockUseResultsStore.mockReturnValue({
      exportResults: mockExportResults,
    });

    render(<ExportControls />);

    const csvButton = screen.getByText('Export CSV');
    fireEvent.click(csvButton);

    await waitFor(() => {
      expect(mockExportResults).toHaveBeenCalledWith('csv');
    });
  });

  it('handles PDF export', async () => {
    const mockExportResults = jest.fn().mockResolvedValue(undefined);
    mockUseResultsStore.mockReturnValue({
      exportResults: mockExportResults,
    });

    render(<ExportControls />);

    const pdfButton = screen.getByText('Export PDF');
    fireEvent.click(pdfButton);

    await waitFor(() => {
      expect(mockExportResults).toHaveBeenCalledWith('pdf');
    });
  });

  it('disables all buttons during export', () => {
    mockUseResultsStore.mockReturnValue({
      exportResults: jest.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
    });

    render(<ExportControls />);

    const jsonButton = screen.getByText('Export JSON');
    fireEvent.click(jsonButton);

    // All buttons should be disabled during export
    expect(screen.getByText('Exporting...')).toBeDisabled();
    expect(screen.getByText('Export CSV')).toBeDisabled();
    expect(screen.getByText('Export PDF')).toBeDisabled();
  });

  it('re-enables buttons after export completes', async () => {
    const mockExportResults = jest.fn().mockResolvedValue(undefined);
    mockUseResultsStore.mockReturnValue({
      exportResults: mockExportResults,
    });

    render(<ExportControls />);

    const jsonButton = screen.getByText('Export JSON');
    fireEvent.click(jsonButton);

    await waitFor(() => {
      expect(mockExportResults).toHaveBeenCalledWith('json');
    });

    // Buttons should be re-enabled
    expect(screen.getByText('Export JSON')).not.toBeDisabled();
    expect(screen.getByText('Export CSV')).not.toBeDisabled();
    expect(screen.getByText('Export PDF')).not.toBeDisabled();
  });

  it('shows export information', () => {
    render(<ExportControls />);

    expect(screen.getByText(/Export Formats:/)).toBeInTheDocument();
    expect(screen.getByText(/JSON includes complete structured data/)).toBeInTheDocument();
  });

  it('handles export errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockExportResults = jest.fn().mockRejectedValue(new Error('Export failed'));
    mockUseResultsStore.mockReturnValue({
      exportResults: mockExportResults,
    });

    render(<ExportControls />);

    const jsonButton = screen.getByText('Export JSON');
    fireEvent.click(jsonButton);

    await waitFor(() => {
      expect(mockExportResults).toHaveBeenCalledWith('json');
    });

    // Button should be re-enabled even after error
    expect(screen.getByText('Export JSON')).not.toBeDisabled();

    consoleSpy.mockRestore();
  });
});
