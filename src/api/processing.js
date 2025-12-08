// Processing API wrapper around existing CLI functionality
const AmazonInvoiceParser = require('../parser/parser');
const { ensureDirectoryExists } = require('../utils/file-operations');
const fs = require('fs').promises;
const path = require('path');

// In-memory job storage (for development - would be replaced with persistent storage in production)
const jobs = new Map();

class ProcessingAPI {
  constructor() {
    this.parser = new AmazonInvoiceParser();
  }

  /**
   * Generate a unique job ID
   */
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new processing job
   * @param {Array} files - Array of uploaded file objects
   * @returns {string} jobId
   */
  async createJob(files) {
    const jobId = this.generateJobId();
    const job = {
      id: jobId,
      status: 'uploading',
      files: files.map(file => ({
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        path: file.path,
        uploadedAt: new Date()
      })),
      created: new Date(),
      results: [],
      errors: []
    };

    jobs.set(jobId, job);
    return jobId;
  }

  /**
   * Start processing a job
   * @param {string} jobId - The job ID to process
   * @returns {Promise<Object>} Processing result
   */
  async processJob(jobId) {
    const job = jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'uploading') {
      throw new Error('Job is not in upload state');
    }

    job.status = 'processing';

    try {
      // Process each file using existing parser
      for (const file of job.files) {
        try {
          const result = await this.parser.parseInvoice(file.path, { silent: true });
          job.results.push({
            filename: file.filename,
            success: true,
            data: result,
            processedAt: new Date()
          });
        } catch (error) {
          job.errors.push({
            filename: file.filename,
            error: error.message,
            processedAt: new Date()
          });
          job.results.push({
            filename: file.filename,
            success: false,
            error: error.message,
            processedAt: new Date()
          });
        }
      }

      job.status = 'completed';
      job.completed = new Date();

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      throw error;
    }

    return this.getJobStatus(jobId);
  }

  /**
   * Get job status and results
   * @param {string} jobId - The job ID to query
   * @returns {Object} Job status and results
   */
  getJobStatus(jobId) {
    const job = jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    return {
      id: job.id,
      status: job.status,
      progress: {
        total: job.files.length,
        processed: job.results.length,
        successful: job.results.filter(r => r.success).length,
        failed: job.results.filter(r => !r.success).length
      },
      files: job.files.map(f => ({
        filename: f.filename,
        size: f.size,
        uploadedAt: f.uploadedAt
      })),
      created: job.created,
      completed: job.completed,
      results: job.results,
      errors: job.errors
    };
  }

  /**
   * Cancel a processing job
   * @param {string} jobId - The job ID to cancel
   * @returns {Object} Cancellation result
   */
  cancelJob(jobId) {
    const job = jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error('Job is already completed or failed');
    }

    job.status = 'cancelled';
    job.cancelledAt = new Date();

    return {
      cancelled: true,
      jobId,
      cancelledAt: job.cancelledAt
    };
  }

  /**
   * Clean up job resources
   * @param {string} jobId - The job ID to clean up
   */
  async cleanupJob(jobId) {
    const job = jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // Delete uploaded files
    for (const file of job.files) {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        // Log but don't fail cleanup
        console.warn(`Failed to delete file ${file.path}:`, error.message);
      }
    }

    // Remove job from memory
    jobs.delete(jobId);

    return { success: true, message: 'Job cleaned up successfully' };
  }

  /**
   * Get job results only
   * @param {string} jobId - The job ID to get results for
   * @returns {Array} Job results
   */
  getJobResults(jobId) {
    const job = jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'completed') {
      throw new Error('Job is not completed yet');
    }

    return job.results;
  }

  /**
   * Get all jobs
   * @returns {Array} All jobs
   */
  getAllJobs() {
    return Array.from(jobs.values());
  }
}

module.exports = ProcessingAPI;