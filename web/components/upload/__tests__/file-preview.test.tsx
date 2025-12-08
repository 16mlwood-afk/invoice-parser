import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilePreview } from '../file-preview';
import { FilePreview as FilePreviewType } from '../types';

// Mock formatFileSize function
jest.mock('../file-validation', () => ({
  formatFileSize: jest.fn((bytes: number) => `${bytes} B`),
}));

const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

const createMockFilePreview = (overrides: Partial<FilePreviewType> = {}): FilePreviewType => ({
  id: 'test-file-123',
  file: mockFile,
  name: 'test.pdf',
  size: 1024,
  type: 'application/pdf',
  validationStatus: 'valid',
  ...overrides,
});

describe('FilePreview', () => {
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders file information correctly', () => {
      const filePreview = createMockFilePreview();
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('1024 B')).toBeInTheDocument();
      expect(screen.getByText('application/pdf')).toBeInTheDocument();
    });

    it('renders PDF icon', () => {
      const filePreview = createMockFilePreview();
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      const pdfIcon = document.querySelector('svg');
      expect(pdfIcon).toBeInTheDocument();
      expect(pdfIcon).toHaveClass('text-red-500');
    });

    it('applies correct status styling for valid files', () => {
      const filePreview = createMockFilePreview({ validationStatus: 'valid' });
      const { container } = render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      const previewElement = container.firstChild as HTMLElement;
      expect(previewElement).toHaveClass('border-success/20');
      expect(previewElement).toHaveClass('bg-success/5');
    });

    it('applies correct status styling for invalid files', () => {
      const filePreview = createMockFilePreview({
        validationStatus: 'invalid',
        errorMessage: 'File too large',
      });
      const { container } = render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      const previewElement = container.firstChild as HTMLElement;
      expect(previewElement).toHaveClass('border-error/20');
      expect(previewElement).toHaveClass('bg-error/5');
    });

    it('applies correct status styling for pending files', () => {
      const filePreview = createMockFilePreview({ validationStatus: 'pending' });
      const { container } = render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      const previewElement = container.firstChild as HTMLElement;
      expect(previewElement).toHaveClass('border-gray-200');
      expect(previewElement).toHaveClass('bg-gray-50');
    });

    it('displays error message for invalid files', () => {
      const filePreview = createMockFilePreview({
        validationStatus: 'invalid',
        errorMessage: 'Invalid file format',
      });
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      expect(screen.getByText('Invalid file format')).toBeInTheDocument();
    });

    it('does not display error message for valid files', () => {
      const filePreview = createMockFilePreview({ validationStatus: 'valid' });
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      expect(screen.queryByText(/error|invalid/i)).not.toBeInTheDocument();
    });
  });

  describe('Status Icons', () => {
    it('shows success icon for valid files', () => {
      const filePreview = createMockFilePreview({ validationStatus: 'valid' });
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      const successIcon = document.querySelector('svg.text-success');
      expect(successIcon).toBeInTheDocument();
    });

    it('shows error icon for invalid files', () => {
      const filePreview = createMockFilePreview({ validationStatus: 'invalid' });
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      const errorIcon = document.querySelector('svg.text-error');
      expect(errorIcon).toBeInTheDocument();
    });

    it('shows loading spinner for pending files', () => {
      const filePreview = createMockFilePreview({ validationStatus: 'pending' });
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      const spinner = document.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('text-gray-400');
    });
  });

  describe('Remove Functionality', () => {
    it('renders remove button when showRemove is true', () => {
      const filePreview = createMockFilePreview();
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} showRemove={true} />);

      const removeButton = screen.getByTestId(`remove-file-${filePreview.id}`);
      expect(removeButton).toBeInTheDocument();
    });

    it('does not render remove button when showRemove is false', () => {
      const filePreview = createMockFilePreview();
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} showRemove={false} />);

      const removeButton = screen.queryByTestId(`remove-file-${filePreview.id}`);
      expect(removeButton).not.toBeInTheDocument();
    });

    it('calls onRemove when remove button is clicked', () => {
      const filePreview = createMockFilePreview();
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      const removeButton = screen.getByTestId(`remove-file-${filePreview.id}`);
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledWith(filePreview.id);
    });

    it('has correct accessibility attributes on remove button', () => {
      const filePreview = createMockFilePreview();
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      const removeButton = screen.getByTestId(`remove-file-${filePreview.id}`);
      expect(removeButton).toHaveAttribute('aria-label', `Remove ${filePreview.name}`);
      expect(removeButton).toHaveAttribute('type', 'button');
    });
  });

  describe('File Type Display', () => {
    it('displays MIME type for PDF files', () => {
      const filePreview = createMockFilePreview({
        type: 'application/pdf',
        name: 'document.pdf',
      });
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      expect(screen.getByText('application/pdf')).toBeInTheDocument();
    });

    it('displays PDF for files with pdf extension', () => {
      const filePreview = createMockFilePreview({
        type: '',
        name: 'document.pdf',
      });
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('displays custom type when provided', () => {
      const filePreview = createMockFilePreview({
        type: 'custom/type',
      });
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      expect(screen.getByText('custom/type')).toBeInTheDocument();
    });
  });

  describe('File Size Formatting', () => {
    it('calls formatFileSize with correct size', () => {
      const filePreview = createMockFilePreview({ size: 2048 });
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      const { formatFileSize } = jest.requireMock('../file-validation');
      expect(formatFileSize).toHaveBeenCalledWith(2048);
    });
  });

  describe('Accessibility', () => {
    it('has proper data-testid for testing', () => {
      const filePreview = createMockFilePreview();
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      const previewElement = screen.getByTestId(`file-preview-${filePreview.id}`);
      expect(previewElement).toBeInTheDocument();
    });

    it('has semantic structure with proper roles', () => {
      const filePreview = createMockFilePreview();
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      // The component should have a proper semantic structure
      const previewElement = screen.getByTestId(`file-preview-${filePreview.id}`);
      expect(previewElement).toHaveClass('flex', 'items-center', 'justify-between');
    });
  });

  describe('Edge Cases', () => {
    it('handles files with very long names', () => {
      const longName = 'a'.repeat(100) + '.pdf';
      const filePreview = createMockFilePreview({ name: longName });
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      const fileNameElement = screen.getByText(longName);
      expect(fileNameElement).toHaveClass('truncate');
    });

    it('handles files with no type specified', () => {
      const filePreview = createMockFilePreview({
        type: '',
        name: 'unknown-file.pdf',
      });
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      expect(screen.getByText('PDF')).toBeInTheDocument(); // Should fall back to 'PDF'
    });

    it('handles empty error messages gracefully', () => {
      const filePreview = createMockFilePreview({
        validationStatus: 'invalid',
        errorMessage: '',
      });
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      // Should not display empty error message - falsy values don't render
      // But the error icon should still be present
      const errorIcon = document.querySelector('.text-error');
      expect(errorIcon).toBeInTheDocument(); // Error icon is present

      // But no error message paragraph should be rendered
      const errorMessage = screen.queryByText('', { selector: 'p.text-error' });
      expect(errorMessage).not.toBeInTheDocument();
    });

    it('handles undefined error messages gracefully', () => {
      const filePreview = createMockFilePreview({
        validationStatus: 'invalid',
        errorMessage: undefined,
      });
      render(<FilePreview file={filePreview} onRemove={mockOnRemove} />);

      // Should not display error message - undefined is falsy
      // But the error icon should still be present
      const errorIcon = document.querySelector('.text-error');
      expect(errorIcon).toBeInTheDocument(); // Error icon is present

      // But no error message paragraph should be rendered
      const errorMessage = screen.queryByText(/./, { selector: 'p.text-error' });
      expect(errorMessage).not.toBeInTheDocument();
    });
  });
});
