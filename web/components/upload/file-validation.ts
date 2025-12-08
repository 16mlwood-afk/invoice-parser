import { FilePreview, ValidationError, ValidationResult } from './types';

// File validation constants
export const FILE_CONSTRAINTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_BATCH_SIZE: 500 * 1024 * 1024, // 500MB
  MAX_FILES: 50,
  ALLOWED_TYPES: ['application/pdf'] as readonly string[],
  ALLOWED_EXTENSIONS: ['.pdf', '.PDF'] as readonly string[],
} as const;

// Error messages matching CLI patterns
export const ERROR_MESSAGES = {
  INVALID_FORMAT: 'File format not supported. Only PDF files are accepted.',
  FILE_TOO_LARGE: (size: number) =>
    `File size (${formatFileSize(size)}) exceeds maximum limit of ${
      formatFileSize(FILE_CONSTRAINTS.MAX_FILE_SIZE)}.`,
  BATCH_TOO_LARGE: (size: number) =>
    `Total batch size (${formatFileSize(size)}) exceeds maximum limit of ${
      formatFileSize(FILE_CONSTRAINTS.MAX_BATCH_SIZE)}.`,
  TOO_MANY_FILES: (count: number) =>
    `Too many files selected. Maximum ${FILE_CONSTRAINTS.MAX_FILES} files allowed, but ${
      count} selected.`,
  DUPLICATE_NAME: 'File with this name already exists in the selection.',
  EMPTY_FILE: 'File appears to be empty.',
} as const;

/**
 * Validates a single file for format, size, and other constraints
 */
export function validateFile(file: File): ValidationError[] {
  const errors: ValidationError[] = [];
  const fileId = `${file.name}-${file.size}-${file.lastModified}`;

  // Check file format
  const isValidFormat = FILE_CONSTRAINTS.ALLOWED_TYPES.includes(file.type) ||
    FILE_CONSTRAINTS.ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));

  if (!isValidFormat) {
    errors.push({
      fileId,
      type: 'format',
      message: ERROR_MESSAGES.INVALID_FORMAT,
    });
  }

  // Check file size
  if (file.size > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
    errors.push({
      fileId,
      type: 'size',
      message: ERROR_MESSAGES.FILE_TOO_LARGE(file.size),
    });
  }

  // Check for empty files
  if (file.size === 0) {
    errors.push({
      fileId,
      type: 'format',
      message: ERROR_MESSAGES.EMPTY_FILE,
    });
  }

  return errors;
}

/**
 * Validates a batch of files including count and total size constraints
 */
export function validateFileBatch(
  files: File[],
  existingFiles: FilePreview[] = [],
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check total file count
  const totalFiles = files.length + existingFiles.length;
  if (totalFiles > FILE_CONSTRAINTS.MAX_FILES) {
    errors.push({
      fileId: 'batch',
      type: 'count',
      message: ERROR_MESSAGES.TOO_MANY_FILES(totalFiles),
    });
    return { isValid: false, errors };
  }

  // Check for duplicate filenames
  const existingNames = new Set(existingFiles.map(f => f.name.toLowerCase()));
  const duplicateFiles = files.filter(file =>
    existingNames.has(file.name.toLowerCase()),
  );

  duplicateFiles.forEach(file => {
    const fileId = `${file.name}-${file.size}-${file.lastModified}`;
    errors.push({
      fileId,
      type: 'format',
      message: ERROR_MESSAGES.DUPLICATE_NAME,
    });
  });

  // Check total batch size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0) +
    existingFiles.reduce((sum, file) => sum + file.size, 0);

  if (totalSize > FILE_CONSTRAINTS.MAX_BATCH_SIZE) {
    errors.push({
      fileId: 'batch',
      type: 'size',
      message: ERROR_MESSAGES.BATCH_TOO_LARGE(totalSize),
    });
  }

  // Validate individual files
  files.forEach(file => {
    const fileErrors = validateFile(file);
    errors.push(...fileErrors);
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Converts a file size in bytes to human-readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Creates a FilePreview object from a File
 */
export function createFilePreview(file: File): FilePreview {
  const errors = validateFile(file);
  const hasErrors = errors.length > 0;

  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    validationStatus: hasErrors ? 'invalid' : 'valid',
    errorMessage: hasErrors ? errors[0].message : undefined,
  };
}

/**
 * Filters valid files from a batch
 */
export function getValidFiles(filePreviews: FilePreview[]): File[] {
  return filePreviews
    .filter(preview => preview.validationStatus === 'valid')
    .map(preview => preview.file);
}

/**
 * Checks if any files in the batch have validation errors
 */
export function hasValidationErrors(filePreviews: FilePreview[]): boolean {
  return filePreviews.some(preview => preview.validationStatus === 'invalid');
}
