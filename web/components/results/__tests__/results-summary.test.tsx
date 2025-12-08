import { render, screen } from '@testing-library/react';
import { ResultsSummary } from '../results-summary';

describe('ResultsSummary', () => {
  const mockSummary = {
    totalFiles: 10,
    processedFiles: 8,
    failedFiles: 2,
    successRate: 80,
  };

  const defaultProps = {
    summary: mockSummary,
    jobStatus: 'completed' as const,
    jobId: 'job-123',
  };

  it('renders summary statistics', () => {
    render(<ResultsSummary {...defaultProps} />);

    expect(screen.getByText('Job Status')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('Total Files')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument();
  });

  it('displays correct status colors', () => {
    render(<ResultsSummary {...defaultProps} />);

    const statusBadge = screen.getByText('completed');
    expect(statusBadge).toHaveClass('text-green-700', 'bg-green-100');
  });

  it('shows different status indicators', () => {
    const statuses = ['completed', 'failed', 'partial'] as const;

    statuses.forEach(status => {
      const { rerender } = render(
        <ResultsSummary {...defaultProps} jobStatus={status} />,
      );

      expect(screen.getByText(status)).toBeInTheDocument();

      // Clean up for next iteration
      rerender(<div />);
    });
  });

  it('displays job ID with copy functionality', () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    render(<ResultsSummary {...defaultProps} />);

    expect(screen.getByText('job-123')).toBeInTheDocument();
    expect(screen.getByTitle('Copy Job ID')).toBeInTheDocument();
  });

  it('shows failed files count', () => {
    render(<ResultsSummary {...defaultProps} />);

    expect(screen.getByText('Failed Files')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays success rate with proper formatting', () => {
    const testCases = [
      { successRate: 100, expected: '100.0%' },
      { successRate: 85.5, expected: '85.5%' },
      { successRate: 0, expected: '0.0%' },
    ];

    testCases.forEach(({ successRate, expected }) => {
      const { rerender } = render(
        <ResultsSummary
          {...defaultProps}
          summary={{ ...mockSummary, successRate }}
        />,
      );

      expect(screen.getByText(expected)).toBeInTheDocument();
      rerender(<div />);
    });
  });

  it('shows appropriate status messages', () => {
    const statusMessages = {
      completed: 'All files processed successfully',
      failed: 'Processing failed for all files',
      partial: 'Some files processed successfully',
    };

    Object.entries(statusMessages).forEach(([status, message]) => {
      const { rerender } = render(
        <ResultsSummary {...defaultProps} jobStatus={status as any} />,
      );

      expect(screen.getByText(message)).toBeInTheDocument();
      rerender(<div />);
    });
  });

  it('displays file processing breakdown', () => {
    render(<ResultsSummary {...defaultProps} />);

    expect(screen.getByText('8 of 10 successful')).toBeInTheDocument();
    expect(screen.getByText('Files uploaded')).toBeInTheDocument();
    expect(screen.getByText('Requires attention')).toBeInTheDocument();
  });

  it('handles zero failed files', () => {
    const summaryWithNoFailures = {
      ...mockSummary,
      failedFiles: 0,
    };

    render(
      <ResultsSummary
        {...defaultProps}
        summary={summaryWithNoFailures}
      />,
    );

    expect(screen.getByText('No failures')).toBeInTheDocument();
  });
});
