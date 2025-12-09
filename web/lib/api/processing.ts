import { ProcessingStatus, ApiResponse } from '@/types/processing';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export class ProcessingApi {
  static async getStatus(jobId: string): Promise<ApiResponse<ProcessingStatus>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/status/${jobId}`);

      if (!response.ok) {
        // For 404 errors, return a structured error response instead of throwing
        if (response.status === 404) {
          return {
            success: false,
            error: 'Job not found',
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      // Extract job data from response (backend returns { success: true, job: jobData })
      const backendData = responseData.job;

      // Transform backend response to match frontend expected format
      try {
        const transformedData: ProcessingStatus = {
          jobId: backendData.id,
          status: backendData.status,
          progress: {
            total: backendData.progress.total,
            completed: backendData.progress.processed,
            failed: backendData.progress.failed,
            percentage: backendData.progress.total > 0
              ? Math.round((backendData.progress.processed / backendData.progress.total) * 100)
              : 0,
          },
          files: backendData.files.map((file: any) => ({
            filename: file.filename,
            status: file.status || 'completed', // Assume completed if not specified
            progress: 100, // Assume 100% if completed
            error: file.error,
            startedAt: file.uploadedAt ? new Date(file.uploadedAt) : undefined,
          })),
          startedAt: new Date(backendData.created),
          completedAt: backendData.completed ? new Date(backendData.completed) : undefined,
        };

        return {
          success: true,
          data: transformedData,
        };
      } catch (transformError) {
        console.error('Error transforming processing status:', transformError, backendData);
        return {
          success: false,
          error: 'Failed to process server response',
        };
      }
    } catch (error) {
      console.error('Failed to fetch processing status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  static async cancelJob(jobId: string): Promise<ApiResponse<{ cancelled: boolean }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/status/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to cancel processing job:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  static async getAllJobs(): Promise<ApiResponse<ProcessingStatus[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/status`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const backendData = await response.json();

      // Transform backend response to match frontend expected format
      try {
        const transformedJobs: ProcessingStatus[] = backendData.data.map((job: any) => ({
          jobId: job.id,
          status: job.status,
          progress: {
            total: job.progress.total,
            completed: job.progress.completed,
            failed: job.progress.failed,
            percentage: job.progress.percentage,
          },
          files: job.files.map((file: any) => ({
            filename: file.filename,
            status: file.status || 'completed',
            progress: file.status === 'completed' ? 100 : 0,
            error: null,
            startedAt: job.created ? new Date(job.created) : undefined,
          })),
          startedAt: new Date(job.created),
          completedAt: job.completed ? new Date(job.completed) : undefined,
        }));

        return {
          success: true,
          data: transformedJobs,
        };
      } catch (transformError) {
        console.error('Error transforming jobs data:', transformError, backendData);
        return {
          success: false,
          error: 'Failed to process server response',
        };
      }
    } catch (error) {
      console.error('Failed to fetch all jobs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
