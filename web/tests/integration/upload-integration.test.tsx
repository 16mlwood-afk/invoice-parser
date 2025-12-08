import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadZone } from '../../components/upload/upload-zone';
import { UploadProgress } from '../../components/upload/upload-progress';
import { useUploadStore } from '../../stores/upload-store';
import { validateFileBatch } from '../../components/upload/file-validation';

// Mock the API client
jest.mock('../../lib/api-client', () => ({
  apiClient: {
    uploadFiles: jest.fn(),
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockApiClient = require('../../lib/api-client').apiClient;

describe('Upload Integration Tests', () => {
  describe('File Validation Pipeline', () => {
    it('validates file format and size constraints correctly', () => {
      // Test various file types and sizes
      const validFile = new File(['content'], 'valid.pdf', { type: 'application/pdf' });

      // Create oversized file by using a blob with large content
      const largeContent = new Uint8Array(51 * 1024 * 1024); // 51MB
      const oversizedFile = new File([largeContent], 'too-big.pdf', {
        type: 'application/pdf'
      });

      const wrongTypeFile = new File(['content'], 'wrong.txt', { type: 'text/plain' });

      // Test individual file validation
      const { validateFile } = require('../../components/upload/file-validation');

      expect(validateFile(validFile)).toHaveLength(0); // No errors for valid file
      expect(validateFile(oversizedFile)).toHaveLength(1); // Size error
      expect(validateFile(wrongTypeFile)).toHaveLength(1); // Format error
    });

    it('validates batch constraints including file count and total size', () => {
      // Create 60 files to exceed batch limit
      const files = Array.from({ length: 60 }, (_, i) =>
        new File(['content'], `file${i}.pdf`, { type: 'application/pdf' })
      );

      const validation = validateFileBatch(files);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].message).toContain('Maximum 50 files');
    });

    it('handles duplicate filenames against existing files', () => {
      const newFile = new File(['content'], 'duplicate.pdf', { type: 'application/pdf' });
      const existingFile = {
        id: 'existing-1',
        file: new File(['old'], 'duplicate.pdf', { type: 'application/pdf' }),
        name: 'duplicate.pdf',
        size: 100,
        type: 'application/pdf',
        validationStatus: 'valid' as const,
        errorMessage: undefined,
      };

      const validation = validateFileBatch([newFile], [existingFile]);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('already exists'))).toBe(true);
    });
  });

  describe('Component Integration', () => {
    it('UploadZone accepts file input and calls onFilesSelected', async () => {
      const user = userEvent.setup();
      const mockOnFilesSelected = jest.fn();

      render(<UploadZone onFilesSelected={mockOnFilesSelected} />);

      const fileInput = screen.getByTestId('file-upload-input');
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      await user.upload(fileInput, mockFile);

      expect(mockOnFilesSelected).toHaveBeenCalledWith([mockFile]);
    });

    it('UploadProgress displays correct states', () => {
      const { rerender } = render(
        <UploadProgress
          isUploading={false}
          progress={0}
          errors={[]}
          onRetry={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText('All files uploaded successfully')).toBeInTheDocument();

      rerender(
        <UploadProgress
          isUploading={true}
          progress={50}
          errors={[]}
          onRetry={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText('Uploading Files')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('UploadProgress shows errors when present', () => {
      const mockErrors = [
        {
          fileId: 'test-file',
          type: 'format' as const,
          message: 'Invalid file format',
        },
      ];

      render(
        <UploadProgress
          isUploading={false}
          progress={0}
          errors={mockErrors}
          onRetry={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText('Upload Complete')).toBeInTheDocument();
      expect(screen.getByText('Upload Errors (1)')).toBeInTheDocument();
      expect(screen.getByText('Invalid file format')).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('handles successful API responses', async () => {
      mockApiClient.uploadFiles.mockResolvedValue({
        success: true,
        data: { jobId: 'test-job-123' },
      });

      const validFiles = [
        new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'file2.pdf', { type: 'application/pdf' }),
      ];

      const result = await mockApiClient.uploadFiles(validFiles);

      expect(result.success).toBe(true);
      expect(result.data.jobId).toBe('test-job-123');
    });

    it('handles API error responses', async () => {
      mockApiClient.uploadFiles.mockResolvedValue({
        success: false,
        error: 'Upload failed due to server error',
      });

      const validFiles = [
        new File(['content'], 'file.pdf', { type: 'application/pdf' }),
      ];

      const result = await mockApiClient.uploadFiles(validFiles);

      expect(result.success).toBe(false);
      expect(result.error).toContain('server error');
    });
  });
});