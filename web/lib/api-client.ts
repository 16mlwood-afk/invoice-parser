import { config } from './config';
import type { InvoiceData } from '../types';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse {
  jobId: string;
  files: Array<{
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
  }>;
}

export interface ProcessingResponse {
  jobId: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export interface StatusResponse {
  jobId: string;
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  files?: Array<{
    filename: string;
    status: string;
    progress: number;
    error?: string;
  }>;
}

export interface ResultsResponse {
  jobId: string;
  status: 'completed' | 'failed' | 'partial';
  summary: {
    totalFiles: number;
    processedFiles: number;
    failedFiles: number;
    successRate: number;
  };
  results: InvoiceData[];
  errors: Array<{
    filename: string;
    error: string;
    details?: any;
  }>;
}

// API Client class
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || config.api.baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Upload files endpoint
  async uploadFiles(files: File[]): Promise<ApiResponse<UploadResponse>> {
    const formData = new FormData();

    files.forEach((file, index) => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Start processing endpoint
  async startProcessing(jobId: string): Promise<ApiResponse<ProcessingResponse>> {
    return this.request<ProcessingResponse>(`/api/process/${jobId}`, {
      method: 'POST',
    });
  }

  // Get processing status endpoint
  async getStatus(jobId: string): Promise<ApiResponse<StatusResponse>> {
    return this.request<StatusResponse>(`/api/status/${jobId}`);
  }

  // Get results endpoint
  async getResults(jobId: string): Promise<ApiResponse<ResultsResponse>> {
    return this.request<ResultsResponse>(`/api/results/${jobId}`);
  }

  // Cleanup endpoint
  async cleanup(jobId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/api/cleanup/${jobId}`, {
      method: 'DELETE',
    });
  }

  // Export results endpoint
  async exportResults(jobId: string, format: 'json' | 'csv' | 'pdf'): Promise<void> {
    const url = `${this.baseUrl}/api/export/${jobId}?format=${format}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get filename from content-disposition header or generate default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `invoice-results-${jobId}.${format}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create download link
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Export failed');
    }
  }

  // Generic GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint);
  }

  // Generic POST request
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Generic PUT request
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Generic DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
