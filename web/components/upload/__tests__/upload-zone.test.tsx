import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadZone } from '../upload-zone';

// Mock File API
const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

// Mock DataTransfer for drag and drop
const createMockDataTransfer = (files: File[]) => ({
  files,
  items: files.map(file => ({ kind: 'file', type: file.type, getAsFile: () => file })),
  types: ['Files'],
});

describe('UploadZone', () => {
  const mockOnFilesSelected = jest.fn();
  const defaultProps = {
    onFilesSelected: mockOnFilesSelected,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the upload zone with correct text and styling', () => {
      render(<UploadZone {...defaultProps} />);

      expect(screen.getByText('Upload invoice files')).toBeInTheDocument();
      expect(screen.getByText(
        'Drag and drop PDF files here, or click to select files'
      )).toBeInTheDocument();
      expect(screen.getByText('PDF files up to 50MB each, maximum 50 files')).toBeInTheDocument(),
      expect(screen.getByRole('button', { name: /upload pdf files/i }))
        .toBeInTheDocument();
    });

    it('renders disabled state correctly', () => {
      render(<UploadZone {...defaultProps} disabled />);

      expect(screen.getByText('Upload disabled')).toBeInTheDocument();
      expect(screen.getByText('File upload is currently disabled')).toBeInTheDocument();
      expect(screen.queryByText('Select Files')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<UploadZone {...defaultProps} className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Drag and Drop Functionality', () => {
    it('handles drag enter and leave events', () => {
      const { container } = render(<UploadZone {...defaultProps} />);
      const dropZone = container.querySelector('[role="button"]') as HTMLElement;

      // Initial state - no drag active
      expect(dropZone).not.toHaveClass('scale-105');

      // Drag enter
      fireEvent.dragEnter(dropZone, {
        dataTransfer: createMockDataTransfer([mockFile]),
      });

      expect(dropZone).toHaveClass('scale-105');

      // Drag leave
      fireEvent.dragLeave(dropZone);

      expect(dropZone).not.toHaveClass('scale-105');
    });

    it('handles file drop correctly', () => {
      const { container } = render(<UploadZone {...defaultProps} />);
      const dropZone = container.querySelector('[role="button"]') as HTMLElement;

      const files = [mockFile, mockFile]; // Two files
      fireEvent.drop(dropZone, {
        dataTransfer: createMockDataTransfer(files),
      });

      expect(mockOnFilesSelected).toHaveBeenCalledWith(files);
    });

    it('ignores drop when disabled', () => {
      const { container } = render(<UploadZone {...defaultProps} disabled />);
      const dropZone = container.querySelector('[role="button"]') as HTMLElement;

      fireEvent.drop(dropZone, {
        dataTransfer: createMockDataTransfer([mockFile]),
      });

      expect(mockOnFilesSelected).not.toHaveBeenCalled();
    });

    it('handles drag over events', () => {
      const { container } = render(<UploadZone {...defaultProps} />);
      const dropZone = container.querySelector('[role="button"]') as HTMLElement;

      fireEvent.dragOver(dropZone, {
        dataTransfer: createMockDataTransfer([mockFile]),
      });

      // Should not throw and should maintain state
      expect(dropZone).toBeInTheDocument();
    });
  });

  describe('File Input Functionality', () => {
    it('handles file selection via click', async () => {
      const user = userEvent.setup();
      render(<UploadZone {...defaultProps} />);

      const fileInput = screen.getByTestId('file-upload-input');

      await user.upload(fileInput, mockFile);

      expect(mockOnFilesSelected).toHaveBeenCalledWith([mockFile]);
    });

    it('resets input value after file selection', async () => {
      const user = userEvent.setup();
      render(<UploadZone {...defaultProps} />);

      const fileInput = screen.getByTestId('file-upload-input') as HTMLInputElement;

      await user.upload(fileInput, mockFile);

      expect(fileInput.value).toBe('');
    });

    it('ignores file selection when disabled', async () => {
      const user = userEvent.setup();
      render(<UploadZone {...defaultProps} disabled />);

      const fileInput = screen.getByTestId('file-upload-input');

      await user.upload(fileInput, mockFile);

      expect(mockOnFilesSelected).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<UploadZone {...defaultProps} />);

      const dropZone = screen.getByRole('button', { name: /upload pdf files/i });

      expect(dropZone).toHaveAttribute(
        'aria-label',
        'Upload PDF files by dragging and dropping or clicking to select',
      );
      expect(dropZone).toHaveAttribute('tabIndex', '0');
    });

    it('has proper ARIA attributes when disabled', () => {
      render(<UploadZone {...defaultProps} disabled />);

      const dropZone = screen.getByRole('button', { name: /upload pdf files/i });

      expect(dropZone).toHaveAttribute('aria-disabled', 'true');
      expect(dropZone).toHaveAttribute('tabIndex', '-1');
    });

    it('has screen reader only file input', () => {
      render(<UploadZone {...defaultProps} />);

      const fileInput = screen.getByTestId('file-upload-input');

      expect(fileInput).toHaveClass('sr-only');
      expect(fileInput).toHaveAttribute('aria-hidden', 'true');
    });

    it('supports keyboard navigation', () => {
      render(<UploadZone {...defaultProps} />);

      const dropZone = screen.getByRole('button', { name: /upload pdf files/i });

      // Focus the drop zone
      dropZone.focus();
      expect(dropZone).toHaveFocus();

      // Check that the drop zone has the correct attributes for keyboard navigation
      expect(dropZone).toHaveAttribute('tabIndex', '0');
      expect(dropZone).toHaveAttribute('aria-disabled', 'false');
    });
  });

  describe('File Input Attributes', () => {
    it('has correct file input attributes', () => {
      render(<UploadZone {...defaultProps} />);

      const fileInput = screen.getByTestId('file-upload-input');

      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('multiple');
      expect(fileInput).toHaveAttribute('accept', '.pdf,application/pdf');
    });

    it('respects disabled state on file input', () => {
      render(<UploadZone {...defaultProps} disabled />);

      const fileInput = screen.getByTestId('file-upload-input');

      expect(fileInput).toBeDisabled();
    });
  });

  describe('Visual Feedback', () => {
    it('shows active state during drag', () => {
      const { container } = render(<UploadZone {...defaultProps} />);
      const dropZone = container.querySelector('[role="button"]') as HTMLElement;

      // Start dragging
      fireEvent.dragEnter(dropZone, {
        dataTransfer: createMockDataTransfer([mockFile]),
      });

      expect(dropZone).toHaveClass('bg-primary/5');
      expect(dropZone).toHaveClass('scale-105');
    });

    it('shows different visual states based on drag status', () => {
      const { container } = render(<UploadZone {...defaultProps} />);
      const dropZone = container.querySelector('[role="button"]') as HTMLElement;

      // Idle state
      expect(dropZone).toHaveClass('border-gray-300');
      expect(dropZone).not.toHaveClass('scale-105');

      // Drag active (over)
      fireEvent.dragEnter(dropZone, {
        dataTransfer: createMockDataTransfer([mockFile]),
      });
      fireEvent.dragOver(dropZone, {
        dataTransfer: createMockDataTransfer([mockFile]),
      });

      expect(dropZone).toHaveClass('border-primary');
      expect(dropZone).toHaveClass('bg-primary/5');
      expect(dropZone).toHaveClass('scale-105');

      // Drag leave
      fireEvent.dragLeave(dropZone);

      expect(dropZone).not.toHaveClass('scale-105');
    });
  });
});
