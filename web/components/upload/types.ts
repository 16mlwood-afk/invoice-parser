// File upload component types

export interface FilePreview {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  validationStatus: 'pending' | 'valid' | 'invalid';
  errorMessage?: string;
  preview?: string;
}

export interface ValidationError {
  fileId: string;
  type: 'format' | 'size' | 'count';
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface UploadState {
  files: FilePreview[];
  isUploading: boolean;
  uploadProgress: number;
  errors: ValidationError[];
}
