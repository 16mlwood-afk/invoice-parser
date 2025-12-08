export interface FileProcessingStatus {
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ProcessingStatus {
  jobId: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
  files: FileProcessingStatus[];
  estimatedCompletion?: Date;
  startedAt: Date;
  completedAt?: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
