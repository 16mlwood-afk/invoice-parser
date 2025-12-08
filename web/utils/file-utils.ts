import { FILE_CONSTRAINTS } from '@/constants';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > FILE_CONSTRAINTS.maxFileSize) {
    return {
      isValid: false,
      error: `File size exceeds maximum limit of ${FILE_CONSTRAINTS.maxFileSize / (1024 * 1024)}MB`,
    };
  }

  // Check MIME type
  if (!FILE_CONSTRAINTS.allowedMimeTypes.includes(file.type as any)) {
    return {
      isValid: false,
      error: 'Only PDF files are allowed',
    };
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!FILE_CONSTRAINTS.allowedExtensions.includes(extension as any)) {
    return {
      isValid: false,
      error: 'File must have a .pdf extension',
    };
  }

  return { isValid: true };
}

export function validateFileBatch(files: File[]): FileValidationResult {
  // Check total batch size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > FILE_CONSTRAINTS.maxBatchSize) {
    return {
      isValid: false,
      error: `Total batch size exceeds maximum limit of ${FILE_CONSTRAINTS.maxBatchSize / (1024 * 1024)}MB`,
    };
  }

  // Check number of files
  if (files.length > FILE_CONSTRAINTS.maxFilesPerBatch) {
    return {
      isValid: false,
      error: `Maximum ${FILE_CONSTRAINTS.maxFilesPerBatch} files allowed per batch`,
    };
  }

  // Validate each file
  for (const file of files) {
    const result = validateFile(file);
    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
