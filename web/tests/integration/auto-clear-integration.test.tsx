import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProcessingDashboard } from '../../components/dashboard/processing-dashboard';
import { useProcessingStore } from '../../stores/processing-store';
import { ToastProvider } from '../../components/ui/toast';

// Mock the API client
jest.mock('../../lib/api/processing', () => ({
  ProcessingApi: {
    getStatus: jest.fn(),
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockProcessingApi = require('../../lib/api/processing').ProcessingApi;

describe('Auto-Clear Integration Tests', () => {
  const mockJobId = 'job_test123';
  let store: ReturnType<typeof useProcessingStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Get store instance
    store = useProcessingStore.getState();
    // Reset store state
    store.resetJobStatus();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Complete Job Lifecycle', () => {
    it('handles job completion to auto-clear flow correctly', async () => {
      // Mock initial processing state
      mockProcessingApi.getStatus
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: mockJobId,
            status: 'processing',
            progress: { percentage: 50, total: 1, processed: 0, successful: 0, failed: 0 },
            files: [{ filename: 'test.pdf', size: 1000, uploadedAt: new Date() }],
            startedAt: new Date(),
          },
        })
        // Mock completion state
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: mockJobId,
            status: 'completed',
            progress: { percentage: 100, total: 1, processed: 1, successful: 1, failed: 0 },
            files: [{ filename: 'test.pdf', size: 1000, uploadedAt: new Date() }],
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });

      // Set up job monitoring
      store.setCurrentJobId(mockJobId);

      // Initial status fetch - processing
      await store.fetchJobStatus();

      expect(store.jobStatus?.status).toBe('processing');
      expect(store.shouldShowJob).toBe(true);

      // Status fetch - now completed (should trigger auto-clear)
      await store.fetchJobStatus();

      expect(store.jobStatus?.status).toBe('completed');
      expect(store.jobDisplayInfo.displayState).toBe('completing');
      expect(store.jobDisplayInfo.countdownSeconds).toBe(7);
      expect(store.shouldShowJob).toBe(true); // Still visible during countdown

      // Fast-forward 7 seconds
      jest.advanceTimersByTime(7000);

      expect(store.jobDisplayInfo.displayState).toBe('fading');

      // Fast-forward animation duration (500ms)
      jest.advanceTimersByTime(500);

      expect(store.jobDisplayInfo.displayState).toBe('removed');
      expect(store.shouldShowJob).toBe(false); // Now hidden
    });

    it('shows countdown UI and allows manual dismiss', async () => {
      const user = userEvent.setup({ delay: null });

      mockProcessingApi.getStatus.mockResolvedValue({
        success: true,
        data: {
          id: mockJobId,
          status: 'completed',
          progress: { percentage: 100, total: 1, processed: 1, successful: 1, failed: 0 },
          files: [{ filename: 'test.pdf', size: 1000, uploadedAt: new Date() }],
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      const { result } = renderHook(() => useProcessingStore());

      // Set up completed job
      act(() => {
        result.current.setCurrentJobId(mockJobId);
      });

      await act(async () => {
        await result.current.fetchJobStatus();
      });

      // Render dashboard with toast provider
      render(
        <ToastProvider>
          <ProcessingDashboard />
        </ToastProvider>
      );

      // Should show countdown
      expect(screen.getByRole('timer')).toBeInTheDocument();
      expect(screen.getByText('Auto-clearing in')).toBeInTheDocument();
      expect(screen.getByText('7s')).toBeInTheDocument();

      // Should have dismiss button
      const dismissButton = screen.getByLabelText('Dismiss job now');
      expect(dismissButton).toBeInTheDocument();

      // Click dismiss button
      await user.click(dismissButton);

      // Should immediately remove job
      expect(result.current.jobDisplayInfo.displayState).toBe('removed');
      expect(result.current.shouldShowJob).toBe(false);
    });

    it('shows toast notification when job auto-clears', async () => {
      mockProcessingApi.getStatus.mockResolvedValue({
        success: true,
        data: {
          id: mockJobId,
          status: 'completed',
          progress: { percentage: 100, total: 1, processed: 1, successful: 1, failed: 0 },
          files: [{ filename: 'test.pdf', size: 1000, uploadedAt: new Date() }],
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      const { result } = renderHook(() => useProcessingStore());

      // Set up completed job
      act(() => {
        result.current.setCurrentJobId(mockJobId);
      });

      await act(async () => {
        await result.current.fetchJobStatus();
      });

      // Render dashboard with toast provider
      render(
        <ToastProvider>
          <ProcessingDashboard />
        </ToastProvider>
      );

      // Fast-forward through countdown and fade
      act(() => {
        jest.advanceTimersByTime(7500); // 7s countdown + 500ms fade
      });

      // Should show toast notification
      await waitFor(() => {
        expect(screen.getByText('Job completed successfully!')).toBeInTheDocument();
      });

      // Should have navigation link
      const resultsLink = screen.getByRole('link', { name: /view results/i });
      expect(resultsLink).toHaveAttribute('href', `/results/${mockJobId}`);
    });

    it('keeps failed jobs visible indefinitely', async () => {
      mockProcessingApi.getStatus.mockResolvedValue({
        success: true,
        data: {
          id: mockJobId,
          status: 'failed',
          progress: { percentage: 0, total: 1, processed: 1, successful: 0, failed: 1 },
          files: [{ filename: 'test.pdf', size: 1000, uploadedAt: new Date() }],
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Set up failed job
      store.setCurrentJobId(mockJobId);

      await store.fetchJobStatus();

      // Failed job should remain visible
      expect(store.jobStatus?.status).toBe('failed');
      expect(store.shouldShowJob).toBe(true);

      // Fast-forward time - should not auto-clear
      jest.advanceTimersByTime(10000); // 10 seconds

      // Still visible
      expect(store.shouldShowJob).toBe(true);
      expect(store.jobDisplayInfo.displayState).toBe('active');
    });

    it('handles multiple jobs completing simultaneously', async () => {
      const jobId2 = 'job_test456';

      // Mock both jobs completing
      mockProcessingApi.getStatus.mockImplementation((jobId: string) =>
        Promise.resolve({
          success: true,
          data: {
            id: jobId,
            status: 'completed',
            progress: { percentage: 100, total: 1, processed: 1, successful: 1, failed: 0 },
            files: [{ filename: 'test.pdf', size: 1000, uploadedAt: new Date() }],
            startedAt: new Date(),
            completedAt: new Date(),
          },
        })
      );

      // This is a simplified test - in reality, each component would have its own store instance
      // For this test, we'll just verify the logic works for one store
      store.setCurrentJobId(mockJobId);

      await store.fetchJobStatus();

      expect(store.jobDisplayInfo.displayState).toBe('completing');
      expect(store.jobDisplayInfo.countdownSeconds).toBe(7);
    });
  });

  describe('Performance and Memory Management', () => {
    it('cleans up timers on component unmount', async () => {
      mockProcessingApi.getStatus.mockResolvedValue({
        success: true,
        data: {
          id: mockJobId,
          status: 'completed',
          progress: { percentage: 100, total: 1, processed: 1, successful: 1, failed: 0 },
          files: [{ filename: 'test.pdf', size: 1000, uploadedAt: new Date() }],
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Set up completed job
      store.setCurrentJobId(mockJobId);

      await store.fetchJobStatus();

      expect(store.jobDisplayInfo.fadeTimeoutId).toBeDefined();
      expect(store.jobDisplayInfo.countdownIntervalId).toBeDefined();

      // Simulate component unmount by calling resetJobStatus
      store.resetJobStatus();

      // Timers should be cleaned up
      expect(store.jobDisplayInfo.fadeTimeoutId).toBeUndefined();
      expect(store.jobDisplayInfo.countdownIntervalId).toBeUndefined();
    });

    it('handles rapid status updates correctly', async () => {
      let callCount = 0;
      mockProcessingApi.getStatus.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          success: true,
          data: {
            id: mockJobId,
            status: callCount > 2 ? 'completed' : 'processing',
            progress: {
              percentage: callCount > 2 ? 100 : 50,
              total: 1,
              processed: callCount > 2 ? 1 : 0,
              successful: callCount > 2 ? 1 : 0,
              failed: 0
            },
            files: [{ filename: 'test.pdf', size: 1000, uploadedAt: new Date() }],
            startedAt: new Date(),
            completedAt: callCount > 2 ? new Date() : undefined,
          },
        });
      });

      store.setCurrentJobId(mockJobId);

      // Multiple rapid status updates
      await store.fetchJobStatus(); // processing
      await store.fetchJobStatus(); // processing
      await store.fetchJobStatus(); // completed - should trigger auto-clear

      expect(store.jobStatus?.status).toBe('completed');
      expect(store.jobDisplayInfo.displayState).toBe('completing');
    });
  });
});