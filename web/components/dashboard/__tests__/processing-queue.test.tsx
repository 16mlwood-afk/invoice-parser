import { render, screen } from '@testing-library/react';
import { ProcessingQueue } from '../processing-queue';
import { FileProcessingStatus } from '@/types/processing';

const mockFiles: FileProcessingStatus[] = [
  {
    filename: 'invoice1.pdf',
    status: 'completed',
    progress: 100,
    startedAt: new Date('2025-12-08T10:00:00Z'),
    completedAt: new Date('2025-12-08T10:05:00Z'),
  },
  {
    filename: 'invoice2.pdf',
    status: 'processing',
    progress: 60,
    startedAt: new Date('2025-12-08T10:10:00Z'),
    completedAt: null,
  },
  {
    filename: 'invoice3.pdf',
    status: 'failed',
    progress: 0,
    error: 'File format not supported',
    startedAt: new Date('2025-12-08T10:15:00Z'),
    completedAt: null,
  },
];

describe('ProcessingQueue', () => {
  it('renders empty state when no files provided', () => {
    render(<ProcessingQueue files={[]} />);

    expect(screen.getByText('No Files')).toBeInTheDocument();
    expect(screen.getByText('No files have been uploaded for processing yet.')).toBeInTheDocument();
  });

  it('displays files in table format on desktop', () => {
    render(<ProcessingQueue files={mockFiles} />);

    // Check if files are displayed
    expect(screen.getByText('invoice1.pdf')).toBeInTheDocument();
    expect(screen.getByText('invoice2.pdf')).toBeInTheDocument();
    expect(screen.getByText('invoice3.pdf')).toBeInTheDocument();

    // Check status badges
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();

    // Check progress indicators
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows sortable table headers', () => {
    render(<ProcessingQueue files={mockFiles} />);

    expect(screen.getByText('File Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('displays error details for failed files', () => {
    const filesWithErrors = mockFiles.filter(file => file.error);

    render(<ProcessingQueue files={filesWithErrors} />);

    expect(screen.getByText('File format not supported')).toBeInTheDocument();
  });

  it('shows file count in header', () => {
    render(<ProcessingQueue files={mockFiles} />);

    expect(screen.getByText('3 files in queue')).toBeInTheDocument();
  });

  it('displays files in card format on mobile', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<ProcessingQueue files={mockFiles} />);

    // Mobile view should show cards, not table
    expect(screen.getByText('invoice1.pdf')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('handles files with very long names', () => {
    const longFilename = 'very-long-invoice-filename-that-might-cause-overflow-issues.pdf';
    const filesWithLongName = [
      {
        ...mockFiles[0],
        filename: longFilename,
      },
    ];

    render(<ProcessingQueue files={filesWithLongName} />);

    const filenameElement = screen.getByText(longFilename);
    expect(filenameElement).toHaveAttribute('title', longFilename);
  });
});
