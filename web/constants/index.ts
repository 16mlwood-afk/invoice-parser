// Application constants

export const APP_CONFIG = {
  name: 'Amazon Invoice Parser',
  version: '1.0.0',
  description: 'Web interface for processing Amazon and retailer invoices',
} as const;

export const FILE_CONSTRAINTS = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxBatchSize: 500 * 1024 * 1024, // 500MB
  maxFilesPerBatch: 50,
  allowedMimeTypes: ['application/pdf'] as const,
  allowedExtensions: ['.pdf'] as const,
} as const;

export const API_ENDPOINTS = {
  upload: '/api/upload',
  process: '/api/process',
  status: '/api/status',
  results: '/api/results',
  cleanup: '/api/cleanup',
} as const;

export const PROCESSING_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const PARSER_REGIONS = [
  { value: 'us', label: 'United States' },
  { value: 'eu', label: 'European Union' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'it', label: 'Italy' },
  { value: 'es', label: 'Spain' },
  { value: 'jp', label: 'Japan' },
  { value: 'au', label: 'Australia' },
  { value: 'ca', label: 'Canada' },
] as const;

export const OUTPUT_FORMATS = [
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
  { value: 'pdf', label: 'PDF' },
] as const;
