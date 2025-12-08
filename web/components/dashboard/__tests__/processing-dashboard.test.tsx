import { render, screen } from '@testing-library/react';
import { ProcessingDashboard } from '../processing-dashboard';
import { useProcessingStore } from '@/stores/processing-store';

// Mock the store
jest.mock('@/stores/processing-store');
const mockUseProcessingStore = useProcessingStore as jest.MockedFunction<typeof useProcessingStore>;

describe('ProcessingDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows no active job message when no jobId is present', () => {
    mockUseProcessingStore.mockReturnValue({
      currentJobId: null,
      jobStatus: null,
      isLoading: false,
      error: null,
      progressPercentage: 0,
      estimatedCompletion: null,
      isActive: false,
      clearError: jest.fn(),
      fetchJobStatus: jest.fn(),
      lastUpdated: null,
      cancelJob: jest.fn(),
    });

    render(<ProcessingDashboard />);

    expect(screen.getByText('No Active Job')).toBeInTheDocument();
    expect(screen.getByText('Go to Upload')).toBeInTheDocument();
  });

  it('displays job information when job is active', () => {
    const mockJobStatus = {
      jobId: 'job-123',
      status: 'processing' as const,
      progress: {
        total: 5,
        completed: 2,
        failed: 0,
        percentage: 40,
      },
      files: [],
      startedAt: new Date('2025-12-08T10:00:00Z'),
      completedAt: null,
      estimatedCompletion: null,
    };

    mockUseProcessingStore.mockReturnValue({
      currentJobId: 'job-123',
      jobStatus: mockJobStatus,
      isLoading: false,
      error: null,
      progressPercentage: 40,
      estimatedCompletion: null,
      isActive: true,
      clearError: jest.fn(),
      fetchJobStatus: jest.fn(),
      lastUpdated: new Date(),
      cancelJob: jest.fn(),
    });

    render(<ProcessingDashboard />);

    expect(screen.getByText('Job job-123')).toBeInTheDocument();
    expect(screen.getByText('40% complete')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });
});
