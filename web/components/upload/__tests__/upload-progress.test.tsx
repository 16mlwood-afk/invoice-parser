import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadProgress } from '../upload-progress';
import { ValidationError } from '../types';

const createMockError = (overrides: Partial<ValidationError> = {}): ValidationError => ({
  fileId: 'test-file-123',
  type: 'format',
  message: 'Test error message',
  ...overrides,
});

describe('UploadProgress', () => {
  const defaultProps = {
    isUploading: false,
    progress: 0,
    errors: [] as ValidationError[],
    onRetry: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders success state when not uploading and no errors', () => {
      render(<UploadProgress {...defaultProps} />);
      expect(screen.getByText('All files uploaded successfully')).toBeInTheDocument();
    });

    it('renders when uploading', () => {
      render(<UploadProgress {...defaultProps} isUploading={true} />);

      expect(screen.getByTestId('upload-progress')).toBeInTheDocument();
      expect(screen.getByText('Uploading Files')).toBeInTheDocument();
    });

    it('renders when there are errors', () => {
      const errors = [createMockError()];
      render(<UploadProgress {...defaultProps} errors={errors} />);

      expect(screen.getByTestId('upload-progress')).toBeInTheDocument();
      expect(screen.getByText('Upload Complete')).toBeInTheDocument();
    });

    it('shows correct title when uploading', () => {
      render(<UploadProgress {...defaultProps} isUploading={true} />);

      expect(screen.getByText('Uploading Files')).toBeInTheDocument();
    });

    it('shows correct title when not uploading', () => {
      const errors = [createMockError()];
      render(<UploadProgress {...defaultProps} errors={errors} />);

      expect(screen.getByText('Upload Complete')).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('renders progress bar when uploading', () => {
      render(<UploadProgress {...defaultProps} isUploading={true} progress={50} />);

      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByTestId('progress-bar-container')).toBeInTheDocument();
      expect(screen.getByTestId('progress-bar-fill')).toBeInTheDocument();
    });

    it('does not render progress bar when not uploading', () => {
      const errors = [createMockError()];
      render(<UploadProgress {...defaultProps} errors={errors} />);

      expect(screen.queryByTestId('progress-bar-container')).not.toBeInTheDocument();
    });

    it('sets correct width on progress bar fill', () => {
      render(<UploadProgress {...defaultProps} isUploading={true} progress={75} />);

      const progressFill = screen.getByTestId('progress-bar-fill');
      expect(progressFill).toHaveStyle({ width: '75%' });
    });

    it('displays progress percentage correctly', () => {
      render(<UploadProgress {...defaultProps} isUploading={true} progress={42} />);

      expect(screen.getByText('42%')).toBeInTheDocument();
    });
  });

  describe('Cancel Button', () => {
    it('renders cancel button when uploading and onCancel provided', () => {
      render(<UploadProgress {...defaultProps} isUploading={true} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('does not render cancel button when not uploading', () => {
      const errors = [createMockError()];
      render(<UploadProgress {...defaultProps} errors={errors} />);

      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('does not render cancel button when onCancel not provided', () => {
      // eslint-disable-next-line no-unused-vars
      const { onCancel, ...propsWithoutCancel } = defaultProps;
      render(<UploadProgress {...propsWithoutCancel} isUploading={true} />);

      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('calls onCancel when cancel button is clicked', () => {
      render(<UploadProgress {...defaultProps} isUploading={true} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Error Display', () => {
    it('renders error section when there are errors', () => {
      const errors = [createMockError({ message: 'File too large' })];
      render(<UploadProgress {...defaultProps} errors={errors} />);

      expect(screen.getByText('Upload Errors (1)')).toBeInTheDocument();
      expect(screen.getByText('File too large')).toBeInTheDocument();
    });

    it('shows error count in header', () => {
      const errors = [
        createMockError({ message: 'Error 1' }),
        createMockError({ message: 'Error 2', fileId: 'file-2' }),
        createMockError({ message: 'Error 3', fileId: 'file-3' }),
      ];
      render(<UploadProgress {...defaultProps} errors={errors} />);

      expect(screen.getByText('Upload Errors (3)')).toBeInTheDocument();
    });

    it('renders retry button when onRetry provided and there are errors', () => {
      const errors = [createMockError()];
      render(<UploadProgress {...defaultProps} errors={errors} />);

      expect(screen.getByText('Retry Failed')).toBeInTheDocument();
    });

    it('does not render retry button when onRetry not provided', () => {
      // eslint-disable-next-line no-unused-vars
      const { onRetry, ...propsWithoutRetry } = defaultProps;
      const errors = [createMockError()];
      render(<UploadProgress {...propsWithoutRetry} errors={errors} />);

      expect(screen.queryByText('Retry Failed')).not.toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const errors = [createMockError()];
      render(<UploadProgress {...defaultProps} errors={errors} />);

      const retryButton = screen.getByText('Retry Failed');
      fireEvent.click(retryButton);

      expect(defaultProps.onRetry).toHaveBeenCalled();
    });

    it('displays multiple errors correctly', () => {
      const errors = [
        createMockError({ message: 'Error 1' }),
        createMockError({ message: 'Error 2', fileId: 'file-2' }),
      ];
      render(<UploadProgress {...defaultProps} errors={errors} />);

      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();
    });

    it('limits error display height with scroll', () => {
      const errors = Array.from({ length: 10 }, (_, i) =>
        createMockError({ message: `Error ${i + 1}`, fileId: `file-${i}` }),
      );
      render(<UploadProgress {...defaultProps} errors={errors} />);

      const errorContainer = document.querySelector('.max-h-32');
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer).toHaveClass('overflow-y-auto');
    });
  });

  describe('Success State', () => {
    it('shows success message when upload completed without errors', () => {
      render(<UploadProgress {...defaultProps} isUploading={false} />);

      expect(screen.getByText('All files uploaded successfully')).toBeInTheDocument();
    });

    it('shows success message after upload completes', () => {
      // Render completed upload with no errors
      render(<UploadProgress {...defaultProps} isUploading={false} progress={100} errors={[]} />);

      expect(screen.getByText('All files uploaded successfully')).toBeInTheDocument();
    });

    it('shows success icon', () => {
      render(<UploadProgress {...defaultProps} isUploading={false} progress={100} errors={[]} />);

      const successIcon = document.querySelector('svg');
      expect(successIcon).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper data-testid for testing', () => {
      render(<UploadProgress {...defaultProps} isUploading={true} />);

      expect(screen.getByTestId('upload-progress')).toBeInTheDocument();
    });

    it('has accessible button labels', () => {
      render(<UploadProgress {...defaultProps} isUploading={true} />);

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toHaveAttribute('type', 'button');
    });

    it('has accessible error messages', () => {
      const errors = [createMockError({ message: 'Test error' })];
      render(<UploadProgress {...defaultProps} errors={errors} />);

      const errorText = screen.getByText('Test error');
      expect(errorText).toBeInTheDocument();
      // Error messages should be in a proper semantic structure
      expect(errorText.closest('.space-y-2')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero progress correctly', () => {
      render(<UploadProgress {...defaultProps} isUploading={true} progress={0} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
      const progressFill = screen.getByTestId('progress-bar-fill');
      expect(progressFill).toHaveStyle({ width: '0%' });
    });

    it('handles 100% progress correctly', () => {
      render(<UploadProgress {...defaultProps} isUploading={true} progress={100} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
      const progressFill = screen.getByTestId('progress-bar-fill');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });

    it('handles empty errors array', () => {
      render(<UploadProgress {...defaultProps} errors={[]} />);

      // Should show success state
      expect(screen.getByText('All files uploaded successfully')).toBeInTheDocument();
    });

    it('handles very long error messages', () => {
      const longMessage = 'a'.repeat(200);
      const errors = [createMockError({ message: longMessage })];
      render(<UploadProgress {...defaultProps} errors={errors} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles special characters in error messages', () => {
      const specialMessage = 'Error: File "test.pdf" contains invalid characters: <>&"\'';
      const errors = [createMockError({ message: specialMessage })];
      render(<UploadProgress {...defaultProps} errors={errors} />);

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    it('retry button has correct styling and behavior', () => {
      const errors = [createMockError()];
      render(<UploadProgress {...defaultProps} errors={errors} />);

      const retryButton = screen.getByText('Retry Failed');
      expect(retryButton).toHaveClass('text-primary', 'bg-primary/10', 'border-primary/20');
      expect(retryButton).toHaveAttribute('type', 'button');
    });

    it('cancel button has correct styling', () => {
      render(<UploadProgress {...defaultProps} isUploading={true} />);

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toHaveClass('text-gray-700', 'bg-white', 'border-gray-300');
    });
  });
});
