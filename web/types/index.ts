// Core application types for the invoice parser frontend

// Re-export processing types
export * from './processing';

export interface FileUpload {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  uploadedAt?: Date;
}

export interface ProcessingState {
  currentJobId?: string;
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
}

export interface CustomerInfo {
  name?: string;
  address?: string;
  email?: string;
  phone?: string;
}

export interface InvoiceItem {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  itemNumber?: string;
}

export interface InvoiceTotals {
  subtotal?: number;
  shipping?: number;
  tax?: number;
  total?: number;
}

export interface InvoiceData {
  filename: string;
  orderNumber?: string;
  orderDate?: string;
  customerInfo?: CustomerInfo;
  items: InvoiceItem[];
  totals: InvoiceTotals;
  currency?: string;
  validationStatus: 'valid' | 'warning' | 'error';
  validationErrors?: string[];
}

export interface ParserSettings {
  defaultRegion: 'us' | 'eu' | 'de' | 'fr' | 'uk' | 'ca' | 'jp' | 'au';
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'JPY' | 'AUD';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  language: 'en' | 'de' | 'fr' | 'es' | 'it' | 'ja';
  validation: {
    strictMode: boolean;
    confidenceThreshold: number; // 0.0 - 1.0
  };
}

export interface UISettings {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'de' | 'fr' | 'es' | 'it' | 'ja';
  itemsPerPage: 10 | 25 | 50 | 100;
  autoRefresh: boolean;
  showConfidenceScores: boolean;
  tableDensity: 'compact' | 'comfortable' | 'spacious';
}

export interface ExportSettings {
  defaultFormat: 'json' | 'csv' | 'pdf';
  includeValidation: boolean;
  includeMetadata: boolean;
  csvDelimiter: ',' | ';' | '\t';
}

export interface UserSettings {
  parser: ParserSettings;
  ui: UISettings;
  export: ExportSettings;
}

export interface AppState {
  files: FileUpload[];
  processing: ProcessingState;
  results: InvoiceData[];
  settings: UserSettings;
}
